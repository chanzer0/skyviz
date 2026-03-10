import { sanitizeText } from './format.js';

const numberFormatter = new Intl.NumberFormat('en-US');
const yearFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  useGrouping: false,
});

const MAX_SUGGESTIONS = 8;
const SHARE_TONE_SYMBOLS = {
  hit: '\u{1F7E9}',
  near: '\u{1F7E8}',
  miss: '\u2B1B',
};
const AIRCRAFT_MODEL_BASE_URL = 'https://cdn.skycards.oldapes.com/assets/models/optimized';

export const CARDLE_GAME_NAME = 'Cardle';
export const CARDLE_HASH = '#cardle';
export const CARDLE_MAX_GUESSES = 8;
export const CARDLE_MAP_REVEAL_GUESS = 3;
export const CARDLE_MODEL_REVEAL_GUESS = 5;
export const CARDLE_TILE_SPECS = Object.freeze([
  { key: 'firstFlight', label: 'First flight' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'wingspan', label: 'Wingspan' },
  { key: 'speed', label: 'Speed' },
  { key: 'range', label: 'Range' },
  { key: 'ceiling', label: 'Ceiling' },
  { key: 'seats', label: 'Seats' },
  { key: 'weight', label: 'Weight' },
]);

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSearchValue(value) {
  return sanitizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeCode(value) {
  return sanitizeText(value).trim().toUpperCase();
}

function asNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatDecimal(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

function formatInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'N/A';
  }
  return numberFormatter.format(Math.round(number));
}

function formatYear(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 'N/A';
  }
  return yearFormatter.format(Math.round(number));
}

function formatWeightTonnes(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 'N/A';
  }
  const tonnes = number / 1000;
  const digits = Number.isInteger(tonnes) ? 0 : 1;
  return `${formatDecimal(tonnes, digits)} t`;
}

function formatRarity(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 'N/A';
  }
  return formatDecimal(number / 100, 2);
}

function buildDisplayValue(key, value) {
  if (key === 'firstFlight') {
    return formatYear(value);
  }
  if (key === 'rarity') {
    return formatRarity(value);
  }
  if (key === 'wingspan') {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${formatDecimal(number, 1)} m` : 'N/A';
  }
  if (key === 'speed') {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${formatInteger(number)} kt` : 'N/A';
  }
  if (key === 'range') {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${formatInteger(number)} nm` : 'N/A';
  }
  if (key === 'ceiling') {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${formatInteger(number)} ft` : 'N/A';
  }
  if (key === 'seats') {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? formatInteger(number) : 'N/A';
  }
  if (key === 'weight') {
    return formatWeightTonnes(value);
  }
  return String(value || 'N/A');
}

function buildImageCodes(model) {
  return unique([
    normalizeCode(model?.imageOverride),
    ...Array.isArray(model?.images) ? model.images.map((entry) => normalizeCode(entry)) : [],
    normalizeCode(model?.id),
  ]);
}

function buildSearchTerms(model) {
  return unique([
    normalizeCode(model?.id),
    sanitizeText(model?.manufacturer),
    sanitizeText(model?.name),
    `${sanitizeText(model?.manufacturer)} ${sanitizeText(model?.name)}`.trim(),
    ...Array.isArray(model?.manufacturers) ? model.manufacturers.map((entry) => sanitizeText(entry)) : [],
  ]);
}

function isGuessableModel(row) {
  return Boolean(
    row.id
    && row.manufacturer
    && row.name
    && Number.isFinite(row.firstFlight) && row.firstFlight > 0
    && Number.isFinite(row.rareness) && row.rareness > 0
    && Number.isFinite(row.wingspan) && row.wingspan > 0
    && Number.isFinite(row.maxSpeed) && row.maxSpeed > 0
    && Number.isFinite(row.range) && row.range > 0
    && Number.isFinite(row.ceiling) && row.ceiling > 0
    && Number.isFinite(row.seats) && row.seats > 0
    && Number.isFinite(row.mtow) && row.mtow > 0
  );
}

function buildModelRow(model, registrationCountsByModelId) {
  const id = normalizeCode(model?.id);
  const manufacturer = sanitizeText(model?.manufacturer);
  const name = sanitizeText(model?.name);
  const displayName = [manufacturer, name].filter(Boolean).join(' ');
  const possibleRegistrationsRaw = registrationCountsByModelId instanceof Map
    ? registrationCountsByModelId.get(id)
    : null;
  return {
    id,
    modelId: id,
    icao: id,
    manufacturer,
    name,
    displayName,
    aliases: buildSearchTerms(model),
    imageCodes: buildImageCodes(model),
    dominantTier: 'cyber',
    firstFlight: asNumber(model?.firstFlight),
    rareness: asNumber(model?.rareness),
    wingspan: asNumber(model?.wingspan),
    maxSpeed: asNumber(model?.maxSpeed),
    range: asNumber(model?.range),
    ceiling: asNumber(model?.ceiling),
    seats: asNumber(model?.seats),
    mtow: asNumber(model?.mtow),
    length: asNumber(model?.length),
    height: asNumber(model?.height),
    category: sanitizeText(model?.cardCategory),
    type: sanitizeText(model?.type),
    engNum: asNumber(model?.engNum),
    engType: sanitizeText(model?.engType),
    military: Boolean(model?.military),
    possibleRegistrations: Number.isFinite(Number(possibleRegistrationsRaw)) ? Number(possibleRegistrationsRaw) : null,
  };
}

export function buildCardleDataset(references) {
  const models = Array.isArray(references?.referenceModels) ? references.referenceModels : [];
  const rows = models
    .map((model) => buildModelRow(model, references?.modelRegistrationCountsByModelId))
    .filter((row) => isGuessableModel(row))
    .sort((left, right) => (
      (right.possibleRegistrations || 0) - (left.possibleRegistrations || 0)
      || left.displayName.localeCompare(right.displayName)
    ));
  return {
    models: rows,
    modelsById: new Map(rows.map((row) => [row.id, row])),
    guessableModels: rows.length,
    manifest: references?.manifest || null,
  };
}

function pickModelBySeed(pool, seed) {
  return pool.reduce((bestModel, row) => {
    if (!bestModel) {
      return row;
    }
    const bestScore = hashString(`${seed}|${bestModel.id}`);
    const rowScore = hashString(`${seed}|${row.id}`);
    if (rowScore !== bestScore) {
      return rowScore < bestScore ? row : bestModel;
    }
    return row.id.localeCompare(bestModel.id) < 0 ? row : bestModel;
  }, null);
}

export function selectDailyCardModel(models, dayKey) {
  return {
    dayKey,
    model: pickModelBySeed(Array.isArray(models) ? models : [], `${dayKey}|cardle`),
  };
}

export function buildCardleOptionLabel(model) {
  return [model?.icao, [model?.manufacturer, model?.name].filter(Boolean).join(' ')].filter(Boolean).join(' / ');
}

function buildSearchHaystack(model) {
  return normalizeSearchValue(model?.aliases?.join(' ') || model?.displayName || '');
}

export function resolveCardleGuess(models, rawQuery, guessedIds = new Set()) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) {
    return null;
  }
  const exactCode = models.find((model) => !guessedIds.has(model.id) && normalizeSearchValue(model.id) === query);
  if (exactCode) {
    return exactCode;
  }
  const exactLabel = models.find((model) => !guessedIds.has(model.id) && normalizeSearchValue(model.displayName) === query);
  if (exactLabel) {
    return exactLabel;
  }
  return null;
}

export function buildCardleSuggestions(models, rawQuery, guessedIds = new Set(), limit = MAX_SUGGESTIONS) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) {
    return [];
  }
  const tokens = query.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const model of Array.isArray(models) ? models : []) {
    if (!model || guessedIds.has(model.id)) {
      continue;
    }
    const haystack = buildSearchHaystack(model);
    if (!tokens.every((token) => haystack.includes(token))) {
      continue;
    }
    const display = normalizeSearchValue(model.displayName);
    const aliases = Array.isArray(model.aliases) ? model.aliases.map((entry) => normalizeSearchValue(entry)) : [];
    scored.push({
      model,
      rank: {
        codeExact: normalizeSearchValue(model.id) === query ? 1 : 0,
        displayExact: display === query ? 1 : 0,
        aliasExact: aliases.includes(query) ? 1 : 0,
        codePrefix: normalizeSearchValue(model.id).startsWith(query) ? 1 : 0,
        displayPrefix: display.startsWith(query) ? 1 : 0,
        aliasPrefix: aliases.some((entry) => entry.startsWith(query)) ? 1 : 0,
        possibleRegistrations: Number(model.possibleRegistrations) || 0,
      },
    });
  }
  return scored
    .sort((left, right) => (
      right.rank.codeExact - left.rank.codeExact
      || right.rank.displayExact - left.rank.displayExact
      || right.rank.aliasExact - left.rank.aliasExact
      || right.rank.codePrefix - left.rank.codePrefix
      || right.rank.displayPrefix - left.rank.displayPrefix
      || right.rank.aliasPrefix - left.rank.aliasPrefix
      || right.rank.possibleRegistrations - left.rank.possibleRegistrations
      || left.model.displayName.localeCompare(right.model.displayName)
    ))
    .slice(0, limit)
    .map((entry) => entry.model);
}

function buildNearThreshold(key, targetValue) {
  const number = Number(targetValue);
  if (!Number.isFinite(number)) {
    return 0;
  }
  if (key === 'firstFlight') {
    return 6;
  }
  if (key === 'rarity') {
    return Math.max(40, number * 0.1);
  }
  if (key === 'wingspan') {
    return Math.max(2.5, number * 0.08);
  }
  if (key === 'speed') {
    return Math.max(25, number * 0.08);
  }
  if (key === 'range') {
    return Math.max(180, number * 0.12);
  }
  if (key === 'ceiling') {
    return Math.max(3000, number * 0.08);
  }
  if (key === 'seats') {
    return Math.max(12, number * 0.15);
  }
  if (key === 'weight') {
    return Math.max(4000, number * 0.15);
  }
  return 0;
}

function isExactMatch(key, guessValue, targetValue) {
  const guessNumber = Number(guessValue);
  const targetNumber = Number(targetValue);
  if (!Number.isFinite(guessNumber) || !Number.isFinite(targetNumber)) {
    return false;
  }
  if (key === 'wingspan') {
    return Math.abs(guessNumber - targetNumber) < 0.05;
  }
  return guessNumber === targetNumber;
}

function compareModelStat(key, guessValue, targetValue) {
  const guessNumber = Number(guessValue);
  const targetNumber = Number(targetValue);
  if (!Number.isFinite(guessNumber) || !Number.isFinite(targetNumber)) {
    return {
      tone: 'miss',
      indicator: '',
    };
  }
  if (isExactMatch(key, guessNumber, targetNumber)) {
    return {
      tone: 'hit',
      indicator: '',
    };
  }
  return {
    tone: Math.abs(guessNumber - targetNumber) <= buildNearThreshold(key, targetNumber) ? 'near' : 'miss',
    indicator: guessNumber < targetNumber ? '\u2191' : '\u2193',
  };
}

function buildTile(key, label, guessValue, targetValue) {
  const comparison = compareModelStat(key, guessValue, targetValue);
  return {
    key,
    label,
    value: buildDisplayValue(key, guessValue),
    rawValue: Number.isFinite(Number(guessValue)) ? Number(guessValue) : null,
    tone: comparison.tone,
    indicator: comparison.indicator,
  };
}

export function buildCardleGuessComparison(guess, target) {
  const tiles = [
    buildTile('firstFlight', 'First flight', guess.firstFlight, target.firstFlight),
    buildTile('rarity', 'Rarity', guess.rareness, target.rareness),
    buildTile('wingspan', 'Wingspan', guess.wingspan, target.wingspan),
    buildTile('speed', 'Speed', guess.maxSpeed, target.maxSpeed),
    buildTile('range', 'Range', guess.range, target.range),
    buildTile('ceiling', 'Ceiling', guess.ceiling, target.ceiling),
    buildTile('seats', 'Seats', guess.seats, target.seats),
    buildTile('weight', 'Weight', guess.mtow, target.mtow),
  ];
  const exactCount = tiles.filter((tile) => tile.tone === 'hit').length;
  const nearCount = tiles.filter((tile) => tile.tone === 'near').length;
  return {
    solved: guess.id === target.id,
    exactCount,
    nearCount,
    missCount: tiles.length - exactCount - nearCount,
    tiles,
  };
}

export function buildCardleModelCandidates(model) {
  const codes = Array.isArray(model?.imageCodes) ? model.imageCodes : [];
  return unique(codes.map((code) => `${AIRCRAFT_MODEL_BASE_URL}/${encodeURIComponent(code)}.glb`));
}

export function buildCardleHotspotUrl(icao) {
  return `https://api.skycards.oldapes.com/models/multipoint/${encodeURIComponent(normalizeCode(icao))}`;
}

export function normalizeCardleHotspotPayload(payload) {
  const coordinates = Array.isArray(payload?.coordinates)
    ? payload.coordinates
      .map((point) => Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null)
      .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    : [];
  return {
    type: 'MultiPoint',
    coordinates,
  };
}

export function buildCardleShareText(challenge, historyEntry, comparisons, options = {}) {
  const solved = historyEntry?.status === 'won';
  const guessCount = Array.isArray(historyEntry?.guesses) ? historyEntry.guesses.length : 0;
  const maxGuesses = Number(challenge?.maxGuesses || CARDLE_MAX_GUESSES);
  const hintWasUsed = guessCount >= CARDLE_MAP_REVEAL_GUESS;
  const headline = `${CARDLE_GAME_NAME} ${challenge.dayKey} ${solved ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}`}${hintWasUsed ? ' \u{1F4A1}' : ''}`;
  const rows = comparisons
    .map((comparison) => comparison.tiles.map((tile) => SHARE_TONE_SYMBOLS[tile.tone] || SHARE_TONE_SYMBOLS.miss).join(''))
    .filter(Boolean);
  const shareUrl = String(options?.shareUrl || '').trim();
  return [headline, '', ...rows, ...(shareUrl ? ['', shareUrl] : [])].join('\n');
}
