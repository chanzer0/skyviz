import { sanitizeText } from './format.js';

const numberFormatter = new Intl.NumberFormat('en-US');
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAILY_TIER_SCHEDULE = ['wildcard', 'hub', 'hub', 'regional', 'regional', 'regional', 'frontier'];
const DAILY_TIER_LABELS = {
  wildcard: 'Wildcard',
  hub: 'Hub',
  regional: 'Regional',
  frontier: 'Frontier',
};
const DAILY_TIER_DESCRIPTIONS = {
  wildcard: 'Any field in the network can be on the board today.',
  hub: 'Today leans toward higher-signal airports with stronger infrastructure clues.',
  regional: 'Today balances familiar airports with tougher regional detail.',
  frontier: 'Today skews more niche. Lean on the clue grid and bearing hints.',
};
const DAILY_TIER_SUGGESTION_RANKS = {
  hub: 2,
  regional: 1,
  frontier: 0,
};
const SIZE_RANKS = {
  small: 0,
  medium: 1,
  large: 2,
};
const COMMUNITY_HINT_GENERIC_WORDS = new Set([
  'airport',
  'airfield',
  'aerodrome',
  'international',
  'intl',
  'municipal',
  'regional',
  'executive',
  'general',
  'aviation',
  'county',
  'city',
  'field',
  'base',
  'station',
  'terminal',
  'airpark',
  'airstrip',
]);
const RUNWAY_MULTI_LAYOUTS = new Set(['parallel', 'intersecting', 'mixed']);
const TONE_SCORES = {
  miss: 0,
  near: 1,
  hit: 2,
};

export const DAILY_GAME_NAME = 'Navdle';
export const DAILY_MAX_SUGGESTIONS = 8;
const DAILY_HINT_UNLOCK_BASE_GUESSES = Object.freeze([3, 5, 7]);
const DAILY_HINT_LIMIT = 4;

const DAILY_SHARE_TONE_SYMBOLS = {
  hit: '🟩',
  near: '🟨',
  miss: '⬛',
};

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

function buildSearchHaystack(airport) {
  return normalizeSearchValue(
    airport?.searchText
    || [
      airport?.ident,
      airport?.iataCode,
      airport?.icaoCode,
      airport?.gpsCode,
      airport?.name,
      airport?.municipality,
      airport?.countryName,
      airport?.regionName,
    ].filter(Boolean).join(' '),
  ).toLowerCase();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(from, to) {
  const earthRadiusKm = 6371;
  const latDelta = toRad((to.latitude || 0) - (from.latitude || 0));
  const lonDelta = toRad((to.longitude || 0) - (from.longitude || 0));
  const startLat = toRad(from.latitude || 0);
  const endLat = toRad(to.latitude || 0);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(from, to) {
  const startLat = toRad(from.latitude || 0);
  const endLat = toRad(to.latitude || 0);
  const deltaLon = toRad((to.longitude || 0) - (from.longitude || 0));
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat)
    - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

function compassFromBearing(bearing) {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % arrows.length;
  return {
    arrow: arrows[index],
    label: labels[index],
  };
}

function compareSizeBucket(guess, target) {
  const guessRank = SIZE_RANKS[guess.sizeBucket] ?? 0;
  const targetRank = SIZE_RANKS[target.sizeBucket] ?? 0;
  if (guessRank === targetRank) {
    return { tone: 'hit', indicator: '', meta: target.scheduledService ? 'Scheduled target' : 'No scheduled target' };
  }
  return {
    tone: Math.abs(guessRank - targetRank) === 1 ? 'near' : 'miss',
    indicator: guessRank < targetRank ? '↑' : '↓',
    meta: guess.scheduledService ? 'Scheduled guess' : 'No scheduled service',
  };
}

function compareContinent(guess, target) {
  return {
    tone: guess.continent === target.continent ? 'hit' : 'miss',
    indicator: '',
    meta: guess.countryName,
  };
}

function compareCountry(guess, target) {
  if (guess.countryCode === target.countryCode) {
    return { tone: 'hit', indicator: '', meta: guess.regionName };
  }
  return {
    tone: guess.continent === target.continent ? 'near' : 'miss',
    indicator: '',
    meta: guess.continentLabel,
  };
}

function compareRegion(guess, target) {
  if (guess.regionCode === target.regionCode) {
    return { tone: 'hit', indicator: '', meta: guess.countryName };
  }
  return {
    tone: guess.countryCode === target.countryCode ? 'near' : 'miss',
    indicator: '',
    meta: guess.countryCode === target.countryCode ? 'Same country' : guess.countryName,
  };
}

function compareNumeric(guessValue, targetValue, nearThreshold) {
  const safeGuess = Number.isFinite(Number(guessValue)) ? Number(guessValue) : 0;
  const safeTarget = Number.isFinite(Number(targetValue)) ? Number(targetValue) : 0;
  if (safeGuess === safeTarget) {
    return { tone: 'hit', indicator: '' };
  }
  return {
    tone: Math.abs(safeGuess - safeTarget) <= nearThreshold ? 'near' : 'miss',
    indicator: safeGuess < safeTarget ? '↑' : '↓',
  };
}

function compareRunwayLayout(guess, target) {
  if (guess.runwayLayout === target.runwayLayout) {
    return { tone: 'hit', indicator: '', meta: guess.surfaceLabel };
  }
  const guessIsMulti = RUNWAY_MULTI_LAYOUTS.has(guess.runwayLayout);
  const targetIsMulti = RUNWAY_MULTI_LAYOUTS.has(target.runwayLayout);
  return {
    tone: guessIsMulti && targetIsMulti ? 'near' : 'miss',
    indicator: '',
    meta: guess.surfaceLabel,
  };
}

function compareDistance(guess, target) {
  const distanceKm = haversineKm(guess, target);
  const bearing = bearingDegrees(guess, target);
  const compass = compassFromBearing(bearing);
  return {
    distanceKm,
    bearing,
    tone: distanceKm < 1 ? 'hit' : distanceKm <= 750 ? 'near' : 'miss',
    indicator: compass.arrow,
    meta: compass.label,
  };
}

function formatAirportTypeValue(airport) {
  const sizeLabel = airport.sizeBucket ? airport.sizeBucket.charAt(0).toUpperCase() + airport.sizeBucket.slice(1) : 'Unknown';
  const typeLabel = sanitizeText(String(airport.type || '').replace(/_/g, ' ')).replace(/^(small|medium|large)\s+/i, '') || 'airport';
  return `${sizeLabel} ${typeLabel}`;
}

function valueOrUnknown(value, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return 'Unknown';
  }
  return `${numberFormatter.format(Number(value))}${suffix}`;
}

export function getUtcDayKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

export function getPreviousUtcDayKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  return new Date(date.getTime() - MS_PER_DAY).toISOString().slice(0, 10);
}

export function getNextUtcResetTime(date = new Date()) {
  const next = new Date(date);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

export function getDailyChallengeProfile(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  const tier = DAILY_TIER_SCHEDULE[date.getUTCDay()] || 'regional';
  return {
    dayKey,
    tier,
    tierLabel: DAILY_TIER_LABELS[tier] || 'Regional',
    description: DAILY_TIER_DESCRIPTIONS[tier] || DAILY_TIER_DESCRIPTIONS.regional,
  };
}

function pickAirportBySeed(pool, seed) {
  return pool.reduce((bestAirport, airport) => {
    if (!bestAirport) {
      return airport;
    }
    const bestScore = hashString(`${seed}|${bestAirport.id}`);
    const airportScore = hashString(`${seed}|${airport.id}`);
    if (airportScore !== bestScore) {
      return airportScore < bestScore ? airport : bestAirport;
    }
    return String(airport.ident || airport.id).localeCompare(String(bestAirport.ident || bestAirport.id)) < 0
      ? airport
      : bestAirport;
  }, null);
}

export function selectDailyAirport(airports, dayKey) {
  const profile = getDailyChallengeProfile(dayKey);
  const basePool = airports.filter((airport) => Number(airport.runwayCount) > 0 && airport.longestRunwayFt !== null);
  const tierPool = profile.tier === 'wildcard'
    ? basePool
    : basePool.filter((airport) => airport.targetTier === profile.tier);
  const targetPool = tierPool.length ? tierPool : basePool;
  const continents = Array.from(
    new Set(targetPool.map((airport) => sanitizeText(airport.continent)).filter((continent) => continent && continent !== 'AN')),
  ).sort();
  const continent = continents.length
    ? continents[hashString(`${dayKey}|continent`) % continents.length]
    : '';
  const continentPool = continent
    ? targetPool.filter((airport) => airport.continent === continent)
    : targetPool;
  return {
    profile,
    continent,
    airport: pickAirportBySeed(continentPool.length ? continentPool : targetPool, `${dayKey}|airport`),
  };
}

export function buildAirportOptionLabel(airport) {
  const codes = [airport.iataCode, airport.icaoCode, airport.gpsCode, airport.ident].filter(Boolean);
  const codeLabel = Array.from(new Set(codes)).slice(0, 2).join(' / ');
  const location = [airport.municipality, airport.countryName].filter(Boolean).join(', ');
  return [codeLabel, airport.name, location].filter(Boolean).join(' · ');
}

export function resolveAirportGuess(airports, rawQuery, guessedIds = new Set()) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) {
    return null;
  }
  const exactCodeMatch = airports.find((airport) => {
    if (guessedIds.has(airport.id)) {
      return false;
    }
    const codes = [airport.ident, airport.iataCode, airport.icaoCode, airport.gpsCode]
      .map((value) => normalizeSearchValue(value))
      .filter(Boolean);
    return codes.includes(query);
  });
  if (exactCodeMatch) {
    return exactCodeMatch;
  }
  const exactLabelMatch = airports.find((airport) => {
    if (guessedIds.has(airport.id)) {
      return false;
    }
    return normalizeSearchValue(airport.name) === query;
  });
  if (exactLabelMatch) {
    return exactLabelMatch;
  }
  return null;
}

export function buildAirportSuggestions(airports, rawQuery, guessedIds = new Set(), limit = DAILY_MAX_SUGGESTIONS) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) {
    return [];
  }
  const tokens = query.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const airport of airports) {
    if (!airport || guessedIds.has(airport.id)) {
      continue;
    }
    const haystack = buildSearchHaystack(airport);
    if (!tokens.every((token) => haystack.includes(token))) {
      continue;
    }
    const codeValues = [airport.ident, airport.iataCode, airport.icaoCode, airport.gpsCode]
      .map((value) => normalizeSearchValue(value))
      .filter(Boolean);
    const name = normalizeSearchValue(airport.name);
    const municipality = normalizeSearchValue(airport.municipality);
    const label = buildAirportOptionLabel(airport);
    scored.push({
      airport,
      label,
      rank: {
        codeExact: codeValues.includes(query) ? 1 : 0,
        nameExact: name === query ? 1 : 0,
        codePrefix: codeValues.some((value) => value.startsWith(query)) ? 1 : 0,
        namePrefix: name.startsWith(query) ? 1 : 0,
        nameContains: name.includes(query) ? 1 : 0,
        municipalityExact: municipality === query ? 1 : 0,
        municipalityPrefix: municipality.startsWith(query) ? 1 : 0,
        municipalityContains: municipality.includes(query) ? 1 : 0,
        scheduledService: airport.scheduledService ? 1 : 0,
        sizeRank: SIZE_RANKS[airport.sizeBucket] ?? 0,
        tierRank: DAILY_TIER_SUGGESTION_RANKS[airport.targetTier] ?? 0,
        runwayCount: Number(airport.runwayCount) || 0,
        longestRunwayFt: Number(airport.longestRunwayFt) || 0,
        navaidCount: Number(airport.navaidCount) || 0,
      },
    });
  }
  return scored
    .sort((left, right) => (
      right.rank.codeExact - left.rank.codeExact
      || right.rank.nameExact - left.rank.nameExact
      || right.rank.codePrefix - left.rank.codePrefix
      || right.rank.namePrefix - left.rank.namePrefix
      || right.rank.nameContains - left.rank.nameContains
      || right.rank.municipalityExact - left.rank.municipalityExact
      || right.rank.municipalityPrefix - left.rank.municipalityPrefix
      || right.rank.municipalityContains - left.rank.municipalityContains
      || right.rank.scheduledService - left.rank.scheduledService
      || right.rank.sizeRank - left.rank.sizeRank
      || right.rank.tierRank - left.rank.tierRank
      || right.rank.runwayCount - left.rank.runwayCount
      || right.rank.longestRunwayFt - left.rank.longestRunwayFt
      || right.rank.navaidCount - left.rank.navaidCount
      || left.label.localeCompare(right.label)
    ))
    .slice(0, limit)
    .map((entry) => entry.airport);
}

export function buildAirportGuessComparison(guess, target) {
  const sizeResult = compareSizeBucket(guess, target);
  const continentResult = compareContinent(guess, target);
  const countryResult = compareCountry(guess, target);
  const regionResult = compareRegion(guess, target);
  const elevationResult = compareNumeric(guess.elevationFt, target.elevationFt, 600);
  const runwayCountResult = compareNumeric(guess.runwayCount, target.runwayCount, 1);
  const longestRunwayResult = compareNumeric(guess.longestRunwayFt, target.longestRunwayFt, 1500);
  const navaidResult = compareNumeric(guess.navaidCount, target.navaidCount, 1);
  const layoutResult = compareRunwayLayout(guess, target);
  const distanceResult = compareDistance(guess, target);
  const tiles = [
    {
      key: 'profile',
      label: 'Profile',
      value: formatAirportTypeValue(guess),
      tone: sizeResult.tone,
      indicator: sizeResult.indicator,
      meta: sizeResult.meta,
    },
    {
      key: 'continent',
      label: 'Continent',
      value: guess.continentLabel || 'Unknown',
      tone: continentResult.tone,
      indicator: continentResult.indicator,
      meta: continentResult.meta,
    },
    {
      key: 'country',
      label: 'Country',
      value: guess.countryName || 'Unknown',
      tone: countryResult.tone,
      indicator: countryResult.indicator,
      meta: countryResult.meta,
    },
    {
      key: 'region',
      label: 'Region',
      value: guess.regionName || 'Unknown',
      tone: regionResult.tone,
      indicator: regionResult.indicator,
      meta: regionResult.meta,
    },
    {
      key: 'elevation',
      label: 'Elevation',
      value: valueOrUnknown(guess.elevationFt, ' ft'),
      tone: elevationResult.tone,
      indicator: elevationResult.indicator,
      meta: guess.elevationFt === null ? 'Unknown elevation' : '',
    },
    {
      key: 'runways',
      label: 'Runways',
      value: valueOrUnknown(guess.runwayCount),
      tone: runwayCountResult.tone,
      indicator: runwayCountResult.indicator,
      meta: guess.surfaceLabel || 'Surface unknown',
    },
    {
      key: 'longest-runway',
      label: 'Longest runway',
      value: valueOrUnknown(guess.longestRunwayFt, ' ft'),
      tone: longestRunwayResult.tone,
      indicator: longestRunwayResult.indicator,
      meta: guess.runwayLayoutLabel || 'Layout unknown',
    },
    {
      key: 'navaids',
      label: 'Navaids',
      value: valueOrUnknown(guess.navaidCount),
      tone: navaidResult.tone,
      indicator: navaidResult.indicator,
      meta: guess.navaidTypes?.length ? guess.navaidTypes.join(' / ') : 'No listed navaids',
    },
    {
      key: 'layout',
      label: 'Layout',
      value: guess.runwayLayoutLabel || 'Unknown layout',
      tone: layoutResult.tone,
      indicator: layoutResult.indicator,
      meta: guess.surfaceLabel || 'Surface unknown',
    },
    {
      key: 'distance',
      label: 'Distance',
      value: `${numberFormatter.format(Math.round(distanceResult.distanceKm))} km`,
      tone: distanceResult.tone,
      indicator: distanceResult.indicator,
      meta: distanceResult.meta,
    },
  ];
  const guessSummary = {
    service: guess.scheduledService ? 'Scheduled service' : 'No scheduled service',
    surface: guess.surfaceLabel || 'Unknown surface',
    radios: `${numberFormatter.format(Number(guess.frequencyCount) || 0)} radio entries`,
    comments: `${numberFormatter.format(Number(guess.commentCount) || 0)} community notes`,
  };
  const exactCount = tiles.filter((tile) => tile.tone === 'hit').length;
  const nearCount = tiles.filter((tile) => tile.tone === 'near').length;
  const missCount = tiles.length - exactCount - nearCount;
  return {
    solved: guess.id === target.id,
    score: tiles.reduce((sum, tile) => sum + (TONE_SCORES[tile.tone] || 0), 0),
    exactCount,
    nearCount,
    missCount,
    distanceKm: distanceResult.distanceKm,
    bearingLabel: distanceResult.meta,
    bearingArrow: distanceResult.indicator,
    tiles,
    guessSummary,
  };
}

function buildCommunityHintIdentifiers(target) {
  const identifierSet = new Set();
  [target.name, target.displayCode, target.iataCode, target.icaoCode, target.gpsCode, target.ident]
    .map((value) => sanitizeText(value).trim())
    .filter(Boolean)
    .forEach((value) => {
      identifierSet.add(value);
    });
  sanitizeText(target.name)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !COMMUNITY_HINT_GENERIC_WORDS.has(token.toLowerCase()))
    .forEach((token) => {
      identifierSet.add(token);
    });
  return Array.from(identifierSet).sort((left, right) => right.length - left.length);
}

function buildCommunityHintMatches(text, target) {
  const matches = [];
  buildCommunityHintIdentifiers(target).forEach((identifier) => {
    const escapedIdentifier = escapeRegExp(identifier);
    const pattern = /^[A-Z0-9-]{3,}$/.test(identifier)
      ? new RegExp(`\\b${escapedIdentifier}\\b`, 'gi')
      : new RegExp(escapedIdentifier, 'gi');
    let match = pattern.exec(text);
    while (match) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
      match = pattern.exec(text);
    }
  });
  matches.sort((left, right) => left.start - right.start || right.end - left.end);
  const acceptedMatches = [];
  let occupiedUntil = -1;
  matches.forEach((match) => {
    if (match.start < occupiedUntil) {
      return;
    }
    acceptedMatches.push(match);
    occupiedUntil = match.end;
  });
  return acceptedMatches;
}

function redactCommunityHintText(text, target) {
  const snippet = sanitizeText(text);
  if (!snippet) {
    return { text: '', redacted: false, parts: [] };
  }
  const matches = buildCommunityHintMatches(snippet, target);
  if (!matches.length) {
    return { text: snippet, redacted: false, parts: [snippet] };
  }
  const parts = [];
  let cursor = 0;
  matches.forEach((match) => {
    if (match.start > cursor) {
      parts.push(snippet.slice(cursor, match.start));
    }
    parts.push({
      type: 'redaction',
      text: match.text,
    });
    cursor = match.end;
  });
  if (cursor < snippet.length) {
    parts.push(snippet.slice(cursor));
  }
  const redactedText = parts
    .map((part) => (typeof part === 'string' ? part : '[redacted]'))
    .join('')
    .replace(/(?:\[redacted\]\s*){2,}/gi, '[redacted] ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
  return {
    text: redactedText,
    redacted: true,
    parts,
  };
}

function buildAirportCommunityHints(target, options = {}) {
  const revealAnswer = Boolean(options?.revealAnswer);
  const commentEntries = Array.isArray(target?.comments)
    ? target.comments
      .map((comment) => ({
        date: sanitizeText(comment?.date),
        subject: sanitizeText(comment?.subject),
        snippet: sanitizeText(comment?.snippet),
      }))
      .filter((comment) => comment.snippet)
    : [];
  const normalizedComments = commentEntries.length
    ? commentEntries
    : sanitizeText(target?.commentSnippet)
      ? [{
        date: '',
        subject: sanitizeText(target?.commentSubject),
        snippet: sanitizeText(target?.commentSnippet),
      }]
      : [];
  return normalizedComments.map((comment) => {
    if (revealAnswer) {
      return {
        label: 'Community note',
        value: comment.snippet,
        source: 'community',
        note: 'Community-submitted and unverified. The note may be inaccurate, outdated, or contain harmful language.',
      };
    }
    const redactedComment = redactCommunityHintText(comment.snippet, target);
    return {
      label: 'Community note',
      value: redactedComment.text,
      valueParts: redactedComment.redacted ? redactedComment.parts : null,
      source: 'community',
      note: redactedComment.redacted
        ? 'Community-submitted and unverified. Direct airport identifiers stay visually redacted and the note may still be inaccurate, outdated, or contain harmful language.'
        : 'Community-submitted and unverified. The note may be inaccurate, outdated, or contain harmful language.',
    };
  });
}

function buildDerivedAirportHints(target) {
  const derivedHints = [];
  if (target.frequencyTypes?.length) {
    derivedHints.push({
      label: 'Radio stack',
      value: `This field carries ${target.frequencyTypes.slice(0, 3).join(', ')} service entries.`,
      source: 'derived',
    });
  }
  if (sanitizeText(target.municipality)) {
    const municipality = sanitizeText(target.municipality);
    derivedHints.push({
      label: 'Municipality',
      value: `The municipality starts with ${municipality.charAt(0)} and has ${municipality.length} letters.`,
      source: 'derived',
    });
  }
  const surfaceLabel = sanitizeText(target.surfaceLabel);
  if (surfaceLabel && !/^unknown/i.test(surfaceLabel)) {
    derivedHints.push({
      label: 'Surface profile',
      value: `The open-data surface profile reads as ${surfaceLabel.toLowerCase()}.`,
      source: 'derived',
    });
  }
  derivedHints.push({
    label: 'Target tier',
    value: `${target.targetTierLabel} challenge field.`,
    source: 'derived',
  });
  return derivedHints.filter((hint) => sanitizeText(hint?.value));
}

export function getDailyHintUnlockThresholds(maxGuesses = 8) {
  const safeMaxGuesses = Math.max(1, Math.floor(Number(maxGuesses) || 8));
  return Array.from(
    new Set([
      ...DAILY_HINT_UNLOCK_BASE_GUESSES.filter((guessNumber) => guessNumber <= safeMaxGuesses),
      safeMaxGuesses,
    ]),
  )
    .sort((left, right) => left - right)
    .slice(0, DAILY_HINT_LIMIT);
}

export function buildAirportHints(target, options = {}) {
  const maxHints = Number.isFinite(Number(options?.maxHints))
    ? Math.max(0, Math.floor(Number(options.maxHints)))
    : DAILY_HINT_LIMIT;
  const hints = [
    ...buildAirportCommunityHints(target, options),
    ...buildDerivedAirportHints(target),
  ];
  return hints.slice(0, maxHints);
}

export function buildAirportHint(target, options = {}) {
  return buildAirportHints(target, options)[0] || {
    label: 'Target tier',
    value: `${target.targetTierLabel} challenge field.`,
    source: 'derived',
  };
}

function normalizeHintRevealCount(entry) {
  const parsedCount = Math.floor(Number(entry?.hintRevealCount));
  if (Number.isFinite(parsedCount) && parsedCount >= 0) {
    return parsedCount;
  }
  return entry?.hintRevealed ? 1 : 0;
}

export function parseDailyHistory(rawValue) {
  if (!rawValue) {
    return { days: {} };
  }
  try {
    const parsed = JSON.parse(rawValue);
    const days = parsed?.days;
    if (!days || typeof days !== 'object' || Array.isArray(days)) {
      return { days: {} };
    }
    const normalizedDays = {};
    Object.entries(days).forEach(([dayKey, entry]) => {
      const guesses = Array.isArray(entry?.guesses)
        ? entry.guesses.map((value) => sanitizeText(value)).filter(Boolean)
        : [];
      const status = entry?.status === 'won' || entry?.status === 'lost' ? entry.status : 'in_progress';
      const hintRevealCount = normalizeHintRevealCount(entry);
      normalizedDays[dayKey] = {
        guesses,
        status,
        hintRevealCount,
        hintRevealed: hintRevealCount > 0,
        completedAt: sanitizeText(entry?.completedAt),
      };
    });
    return { days: normalizedDays };
  } catch {
    return { days: {} };
  }
}

export function serializeDailyHistory(history) {
  return JSON.stringify({
    version: 2,
    days: history?.days || {},
  });
}

export function buildDailyStats(history) {
  const entries = Object.entries(history?.days || {}).sort(([left], [right]) => left.localeCompare(right));
  let played = 0;
  let wins = 0;
  let best = null;
  let currentStreak = 0;
  let longestStreak = 0;
  let rollingStreak = 0;
  let previousDayKey = '';

  for (const [dayKey, entry] of entries) {
    if (entry.status !== 'won' && entry.status !== 'lost') {
      continue;
    }
    played += 1;
    if (entry.status === 'won') {
      wins += 1;
      best = best === null ? entry.guesses.length : Math.min(best, entry.guesses.length);
      const expectedPrevious = previousDayKey ? getPreviousUtcDayKey(dayKey) : '';
      rollingStreak = previousDayKey && expectedPrevious === previousDayKey && history.days[previousDayKey]?.status === 'won'
        ? rollingStreak + 1
        : 1;
      longestStreak = Math.max(longestStreak, rollingStreak);
    } else {
      rollingStreak = 0;
    }
    previousDayKey = dayKey;
  }

  const latestCompletedDayKey = entries
    .map(([dayKey, entry]) => ({ dayKey, status: entry.status }))
    .filter((entry) => entry.status === 'won' || entry.status === 'lost')
    .map((entry) => entry.dayKey)
    .pop();

  if (latestCompletedDayKey) {
    let cursor = latestCompletedDayKey;
    while (history.days[cursor]?.status === 'won') {
      currentStreak += 1;
      cursor = getPreviousUtcDayKey(cursor);
    }
  }

  return {
    played,
    wins,
    losses: Math.max(played - wins, 0),
    winRate: played ? Math.round((wins / played) * 100) : 0,
    currentStreak,
    longestStreak,
    best,
  };
}

export function buildDailyShareText(challenge, historyEntry, comparisons, options = {}) {
  const solved = historyEntry?.status === 'won';
  const guessCount = Array.isArray(historyEntry?.guesses) ? historyEntry.guesses.length : 0;
  const maxGuesses = Number(challenge?.maxGuesses || 8);
  const hintWasUsed = normalizeHintRevealCount(historyEntry) > 0;
  const headline = `${DAILY_GAME_NAME} ${challenge.dayKey} ${solved ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}`}${hintWasUsed ? ' 💡' : ''}`;
  const rows = comparisons
    .map((comparison) => comparison.tiles.map((tile) => DAILY_SHARE_TONE_SYMBOLS[tile.tone] || DAILY_SHARE_TONE_SYMBOLS.miss).join(''))
    .filter(Boolean);
  const shareUrl = String(options?.shareUrl || '').trim();
  return [headline, '', ...rows, ...(shareUrl ? ['', shareUrl] : [])].join('\n');
}
