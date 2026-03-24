import { CONTINENT_LABELS, continentFromCountryCode } from './continents.js';
import { formatLabel, formatPlaceCode, sanitizeText } from './format.js';

export const TIER_ORDER = ['paper', 'bronze', 'silver', 'gold', 'platinum', 'cyber', 'unknown'];
export const TIER_COLORS = {
  paper: '#8fa2b4',
  bronze: '#b6754b',
  silver: '#76889d',
  gold: '#d8a33a',
  platinum: '#4da8bb',
  cyber: '#de6755',
  unknown: '#647686',
};

export const CATEGORY_ORDER = ['ultra', 'rare', 'scarce', 'uncommon', 'common', 'historical', 'fantasy', 'unknown'];
export const CATEGORY_COLORS = {
  ultra: '#0f3f70',
  rare: '#168392',
  scarce: '#ec7f35',
  uncommon: '#7e9e4d',
  common: '#7f94a2',
  historical: '#9d724d',
  fantasy: '#cb5162',
  unknown: '#677984',
};

export const TYPE_ORDER = ['L', 'H', 'A', 'G', 'T', '_', 'unknown'];
export const TYPE_LABELS = {
  L: 'Landplane',
  H: 'Helicopter',
  A: 'Amphibious',
  G: 'Gyro / Rotorcraft',
  T: 'Tiltrotor',
  _: 'Specialty',
  unknown: 'Unknown',
};

export const TYPE_COLORS = {
  L: '#0f3f70',
  H: '#168392',
  A: '#ec7f35',
  G: '#7e9e4d',
  T: '#cb5162',
  _: '#697c8a',
  unknown: '#768a98',
};

export const CONTINENT_ORDER = ['NA', 'SA', 'EU', 'AF', 'AS', 'OC', 'AN', 'unknown'];
export const CONTINENT_COLORS = {
  NA: '#0f3f70',
  SA: '#168392',
  EU: '#ec7f35',
  AF: '#7e9e4d',
  AS: '#cb5162',
  OC: '#587b9f',
  AN: '#8b8fa0',
  unknown: '#6e7f8e',
};

const US_STATE_LABELS = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

const ENGINE_TYPE_LABELS = {
  p: 'Piston',
  j: 'Jet',
  t: 'Turboprop',
  e: 'Electric',
  r: 'Rocket',
  _: 'Specialty',
  unknown: 'Unknown',
};

const PROGRESS_PALETTE = ['#0f3f70', '#168392', '#ec7f35', '#7e9e4d', '#cb5162', '#587b9f', '#8b8fa0', '#c27b42'];
const REGISTRATION_CONFIDENCE_ORDER = ['manual', 'high', 'medium', 'low', 'ambiguous'];
const INFERENCE_STATUS_CONFIDENCE_MAP = {
  inferred_high_confidence: 'high',
  inferred_medium_confidence: 'medium',
  ambiguous: 'ambiguous',
  unresolved: 'low',
};

const regionFormatter = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

const referenceState = {
  manifestPromise: null,
  dataPromise: null,
  cardleDataPromise: null,
};
const airportGameState = {
  manifestPromise: null,
  dataPromise: null,
};
const runtimeConfigState = {
  promise: null,
};
const SITE_BASE_URL = new URL('../', import.meta.url);
const COMPLETIONIST_LOCAL_SOURCE_KEY = 'local';

function resolveSiteAssetUrl(path) {
  return new URL(path, SITE_BASE_URL).toString();
}

export async function loadReferenceManifest() {
  if (!referenceState.manifestPromise) {
    referenceState.manifestPromise = fetchJson(resolveSiteAssetUrl('data/reference/manifest.json')).catch((error) => {
      referenceState.manifestPromise = null;
      throw error;
    });
  }
  return referenceState.manifestPromise;
}

export async function loadReferenceData() {
  if (!referenceState.dataPromise) {
    referenceState.dataPromise = loadReferenceManifest().then(async (manifest) => {
      const [
        modelsPayload,
        airportsPayload,
        modelRegistrationCountsPayload,
        aircraftLookupPayload,
        resolvedAircraftLookupPayload,
        inferredAircraftMappingsPayload,
      ] = await Promise.all([
        fetchJson(getManifestDatasetPath(manifest, 'models', './data/reference/models.json')),
        fetchJson(getManifestDatasetPath(manifest, 'airports', './data/reference/airports.json')),
        fetchJsonOptional(getManifestDatasetPath(manifest, 'modelRegistrationCounts')),
        fetchJsonOptional(getManifestDatasetPath(manifest, 'aircraftLookup')),
        fetchJsonOptional(getManifestDatasetPath(manifest, 'aircraftLookupResolved')),
        fetchJsonOptional(getManifestDatasetPath(manifest, 'inferredAircraftMappings')),
      ]);

      const modelRows = asArray(modelsPayload.rows);
      const airportRows = asArray(airportsPayload.rows);
      const allAirports = airportRows.map((row) => buildAirportRef(row));
      const modelRegistrationCountsByModelId = buildModelRegistrationCountMap(modelRegistrationCountsPayload);
      const aircraftLookupByHex = mergeLookupMaps(
        buildAircraftLookupMap(aircraftLookupPayload?.byAircraftHex),
        buildAircraftLookupMap(resolvedAircraftLookupPayload?.byAircraftHex),
      );
      const aircraftLookupByReg = mergeLookupMaps(
        buildAircraftLookupMap(aircraftLookupPayload?.byRegistration),
        buildAircraftLookupMap(resolvedAircraftLookupPayload?.byRegistration),
      );
      const inferredMappingsIndex = buildInferredMappingIndex(inferredAircraftMappingsPayload);
      return {
        manifest,
        modelsPayload,
        airportsPayload,
        modelRegistrationCountsPayload,
        aircraftLookupPayload,
        resolvedAircraftLookupPayload,
        inferredAircraftMappingsPayload,
        referenceModels: modelRows,
        allAirports,
        modelsById: new Map(modelRows.map((row) => [normalizeCode(row.id), row])),
        airportsById: new Map(allAirports.map((row) => [row.id, row])),
        airportsByCode: buildAirportCodeIndex(allAirports),
        modelRegistrationCountsByModelId,
        aircraftLookupByHex,
        aircraftLookupByReg,
        inferredMappingsIndex,
      };
    }).catch((error) => {
      referenceState.dataPromise = null;
      throw error;
    });
  }
  return referenceState.dataPromise;
}

export async function loadCardleReferenceData() {
  if (!referenceState.cardleDataPromise) {
    referenceState.cardleDataPromise = loadReferenceManifest().then(async (manifest) => {
      const [
        modelsPayload,
        modelRegistrationCountsPayload,
      ] = await Promise.all([
        fetchJson(getManifestDatasetPath(manifest, 'models', './data/reference/models.json')),
        fetchJsonOptional(getManifestDatasetPath(manifest, 'modelRegistrationCounts')),
      ]);
      const modelRows = asArray(modelsPayload.rows);
      const modelRegistrationCountsByModelId = buildModelRegistrationCountMap(modelRegistrationCountsPayload);
      return {
        manifest,
        modelsPayload,
        modelRegistrationCountsPayload,
        referenceModels: modelRows,
        modelsById: new Map(modelRows.map((row) => [normalizeCode(row.id), row])),
        modelRegistrationCountsByModelId,
      };
    }).catch((error) => {
      referenceState.cardleDataPromise = null;
      throw error;
    });
  }
  return referenceState.cardleDataPromise;
}

export async function loadAirportGameManifest() {
  if (!airportGameState.manifestPromise) {
    airportGameState.manifestPromise = fetchJson(resolveSiteAssetUrl('data/airports/manifest.json')).catch((error) => {
      airportGameState.manifestPromise = null;
      throw error;
    });
  }
  return airportGameState.manifestPromise;
}

export async function loadAirportGameData() {
  if (!airportGameState.dataPromise) {
    airportGameState.dataPromise = loadAirportGameManifest().then(async (manifest) => {
      const datasetPath = resolveAirportGameDatasetPath(manifest?.dailyDataPath || './data/airports/daily-game.json');
      const payload = await fetchJson(datasetPath);
      const airports = asArray(payload?.airports).filter((row) => row && typeof row === 'object');
      return {
        manifest,
        payload,
        airports,
        airportsById: new Map(
          airports
            .map((row) => [sanitizeText(row.id), row])
            .filter(([id]) => Boolean(id)),
        ),
      };
    }).catch((error) => {
      airportGameState.dataPromise = null;
      throw error;
    });
  }
  return airportGameState.dataPromise;
}

export async function fetchCompletionistSnapshotData() {
  const source = await resolveCompletionistManifestSource();
  const manifestUrl = source.manifestUrl;
  const manifest = await fetchJson(manifestUrl);
  const snapshotPath = resolveLiveDatasetPath(
    manifest?.snapshotPath || './completionist-snapshot.json',
    manifestUrl,
  );
  const payload = await fetchJson(snapshotPath);
  const fields = asArray(payload?.fields).map((field) => sanitizeText(field));
  const rows = asArray(payload?.rows)
    .map((row) => normalizeCompletionistFlightRow(row, fields))
    .filter(Boolean);
  return {
    manifestUrl,
    manifest,
    payload,
    fields,
    rows,
    source: {
      ...source,
      snapshotUrl: snapshotPath,
    },
  };
}

async function loadRuntimeConfig() {
  if (!runtimeConfigState.promise) {
    runtimeConfigState.promise = fetchJsonOptional(resolveSiteAssetUrl('data/runtime-config.json'))
      .catch(() => null);
  }
  return runtimeConfigState.promise;
}

function getCompletionistManifestOverride() {
  if (typeof window !== 'object' || !(window.location instanceof Location)) {
    return '';
  }
  try {
    return sanitizeText(new URL(window.location.href).searchParams.get('completionistManifestUrl'));
  } catch (_error) {
    return '';
  }
}

function getCompletionistSourceOverride() {
  if (typeof window !== 'object' || !(window.location instanceof Location)) {
    return '';
  }
  try {
    return sanitizeText(new URL(window.location.href).searchParams.get('completionistSource'));
  } catch (_error) {
    return '';
  }
}

function shouldPreferLocalCompletionistManifest() {
  if (typeof window !== 'object' || !(window.location instanceof Location)) {
    return false;
  }
  return (
    window.location.protocol === 'file:'
    || window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
  );
}

function normalizeCompletionistSourceKey(value) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function normalizeCompletionistSourceRole(value) {
  const normalized = sanitizeText(value).toLowerCase();
  return normalized === 'active' || normalized === 'shadow' || normalized === 'legacy'
    ? normalized
    : '';
}

function buildLocalCompletionistSource() {
  return {
    key: COMPLETIONIST_LOCAL_SOURCE_KEY,
    label: 'Local fixture',
    manifestUrl: resolveSiteAssetUrl('data/live/completionist-manifest.json'),
    role: 'local',
    selection: 'local-preview',
  };
}

function normalizeCompletionistRuntimeConfig(runtimeConfig) {
  const completionist = runtimeConfig?.completionist;
  const sources = new Map();
  const rawSources = completionist?.sources;
  if (rawSources && typeof rawSources === 'object' && !Array.isArray(rawSources)) {
    Object.entries(rawSources).forEach(([rawKey, rawSource]) => {
      if (!rawSource || typeof rawSource !== 'object' || Array.isArray(rawSource)) {
        return;
      }
      const key = normalizeCompletionistSourceKey(rawKey);
      const manifestUrl = sanitizeText(rawSource.manifestUrl);
      if (!key || !manifestUrl) {
        return;
      }
      sources.set(key, {
        key,
        label: sanitizeText(rawSource.label) || rawKey,
        manifestUrl,
        role: normalizeCompletionistSourceRole(rawSource.role),
      });
    });
  }
  return {
    sources,
    activeSourceKey: normalizeCompletionistSourceKey(completionist?.activeSource),
    shadowSourceKey: normalizeCompletionistSourceKey(completionist?.shadowSource),
  };
}

function resolveCompletionistSourceAlias(rawKey, runtimeConfig) {
  const normalizedKey = normalizeCompletionistSourceKey(rawKey);
  if (!normalizedKey) {
    return '';
  }
  if (normalizedKey === 'local' || normalizedKey === 'fixture' || normalizedKey === 'preview') {
    return COMPLETIONIST_LOCAL_SOURCE_KEY;
  }
  if (normalizedKey === 'active') {
    return runtimeConfig.activeSourceKey;
  }
  if (normalizedKey === 'shadow') {
    return runtimeConfig.shadowSourceKey;
  }
  return normalizedKey;
}

function resolveConfiguredCompletionistSource(runtimeConfig, rawKey) {
  const resolvedKey = resolveCompletionistSourceAlias(rawKey, runtimeConfig);
  if (!resolvedKey) {
    return null;
  }
  if (resolvedKey === COMPLETIONIST_LOCAL_SOURCE_KEY) {
    return buildLocalCompletionistSource();
  }
  const source = runtimeConfig.sources.get(resolvedKey);
  if (!source) {
    return null;
  }
  const role = source.role
    || (resolvedKey === runtimeConfig.shadowSourceKey ? 'shadow' : '')
    || (resolvedKey === runtimeConfig.activeSourceKey ? 'active' : '');
  return {
    ...source,
    role,
  };
}

async function resolveCompletionistManifestSource() {
  const override = getCompletionistManifestOverride();
  if (override) {
    return {
      key: 'manifest-override',
      label: 'Manual manifest override',
      manifestUrl: override,
      role: 'override',
      selection: 'manifest-override',
    };
  }
  const runtimeConfig = await loadRuntimeConfig();
  const normalizedRuntimeConfig = normalizeCompletionistRuntimeConfig(runtimeConfig);
  const sourceOverride = resolveConfiguredCompletionistSource(
    normalizedRuntimeConfig,
    getCompletionistSourceOverride(),
  );
  if (sourceOverride) {
    return {
      ...sourceOverride,
      selection: 'source-override',
    };
  }
  if (shouldPreferLocalCompletionistManifest()) {
    return buildLocalCompletionistSource();
  }
  const activeSource = resolveConfiguredCompletionistSource(
    normalizedRuntimeConfig,
    normalizedRuntimeConfig.activeSourceKey,
  );
  if (activeSource) {
    return {
      ...activeSource,
      selection: 'runtime-active',
    };
  }
  const configuredPath = sanitizeText(
    runtimeConfig?.completionist?.manifestUrl || runtimeConfig?.completionistManifestUrl,
  );
  if (configuredPath) {
    return {
      key: 'legacy-manifest',
      label: 'Configured completionist manifest',
      manifestUrl: configuredPath,
      role: 'legacy',
      selection: 'runtime-legacy',
    };
  }
  return buildLocalCompletionistSource();
}

function getManifestDatasetPath(manifest, datasetKey, fallbackPath = null) {
  const datasetPath = sanitizeText(manifest?.datasets?.[datasetKey]?.path);
  if (datasetPath) {
    return resolveReferenceDatasetPath(datasetPath);
  }
  return fallbackPath ? resolveReferenceDatasetPath(fallbackPath) : fallbackPath;
}

function resolveReferenceDatasetPath(path) {
  const normalizedPath = sanitizeText(path);
  if (!normalizedPath) {
    return '';
  }
  if (
    normalizedPath.startsWith('http://')
    || normalizedPath.startsWith('https://')
    || normalizedPath.startsWith('/')
  ) {
    return normalizedPath;
  }
  if (normalizedPath.startsWith('./data/reference/')) {
    return resolveSiteAssetUrl(normalizedPath.slice(2));
  }
  if (normalizedPath.startsWith('data/reference/')) {
    return resolveSiteAssetUrl(normalizedPath);
  }
  if (normalizedPath.startsWith('./')) {
    return resolveSiteAssetUrl(`data/reference/${normalizedPath.slice(2)}`);
  }
  return resolveSiteAssetUrl(`data/reference/${normalizedPath}`);
}

function resolveAirportGameDatasetPath(path) {
  const normalizedPath = sanitizeText(path);
  if (!normalizedPath) {
    return '';
  }
  if (
    normalizedPath.startsWith('http://')
    || normalizedPath.startsWith('https://')
    || normalizedPath.startsWith('/')
  ) {
    return normalizedPath;
  }
  if (normalizedPath.startsWith('./data/airports/')) {
    return resolveSiteAssetUrl(normalizedPath.slice(2));
  }
  if (normalizedPath.startsWith('data/airports/')) {
    return resolveSiteAssetUrl(normalizedPath);
  }
  if (normalizedPath.startsWith('./')) {
    return resolveSiteAssetUrl(`data/airports/${normalizedPath.slice(2)}`);
  }
  return resolveSiteAssetUrl(`data/airports/${normalizedPath}`);
}

function resolveLiveDatasetPath(path, manifestUrl = resolveSiteAssetUrl('data/live/completionist-manifest.json')) {
  const normalizedPath = sanitizeText(path);
  if (!normalizedPath) {
    return '';
  }
  if (
    normalizedPath.startsWith('http://')
      || normalizedPath.startsWith('https://')
      || normalizedPath.startsWith('/')
  ) {
    return normalizedPath;
  }
  if (manifestUrl) {
    try {
      return new URL(normalizedPath, manifestUrl).toString();
    } catch (_error) {
      // Fall through to legacy path resolution.
    }
  }
  if (normalizedPath.startsWith('./data/live/')) {
    return resolveSiteAssetUrl(normalizedPath.slice(2));
  }
  if (normalizedPath.startsWith('data/live/')) {
    return resolveSiteAssetUrl(normalizedPath);
  }
  if (normalizedPath.startsWith('./')) {
    return resolveSiteAssetUrl(`data/live/${normalizedPath.slice(2)}`);
  }
  return resolveSiteAssetUrl(`data/live/${normalizedPath}`);
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function fetchJsonOptional(path) {
  if (!path) {
    return null;
  }
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

function normalizeCode(value) {
  return sanitizeText(value).toUpperCase();
}

function normalizeCompletionistFlightRow(row, fields) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const fieldIndex = new Map(fields.map((field, index) => [field, index]));
  const readValue = (key) => {
    if (Array.isArray(row)) {
      return row[fieldIndex.get(key) ?? -1];
    }
    return row[key];
  };
  const id = sanitizeText(readValue('flightId') || readValue('id'));
  const lat = asNumber(readValue('lat'));
  const lon = asNumber(readValue('lon'));
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  return {
    id,
    aircraftHex: normalizeCode(readValue('aircraftHex') || readValue('hex')),
    lat,
    lon,
    track: asNumber(readValue('track')),
    altitude: asNumber(readValue('altitude')),
    speed: asNumber(readValue('speed')),
    typeCode: normalizeCode(readValue('typeCode')),
    registration: normalizeCode(readValue('registration')),
    seenAt: asNumber(readValue('seenAt')),
    origin: normalizeCode(readValue('origin')),
    destination: normalizeCode(readValue('destination')),
    flightNumber: normalizeCode(readValue('flightNumber')),
    callsign: normalizeCode(readValue('callsign')),
  };
}

function normalizeKey(value) {
  return sanitizeText(value).toLowerCase() || 'unknown';
}

function asNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRegistration(value) {
  return sanitizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function buildRegistrationMappingKey(aircraftHex, registration) {
  const normalizedHex = sanitizeText(aircraftHex).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normalizedRegistration = normalizeRegistration(registration);
  if (!normalizedHex && !normalizedRegistration) {
    return '';
  }
  return `${normalizedHex}|${normalizedRegistration}`;
}

function aircraftIdToHex(value) {
  const number = asNumber(value);
  if (!Number.isFinite(number) || number < 0) {
    return '';
  }
  const rounded = Math.trunc(number);
  const hex = rounded.toString(16).toUpperCase();
  return hex.length < 6 ? hex.padStart(6, '0') : hex;
}

function buildModelRegistrationCountMap(payload) {
  const lookup = new Map();
  const rows = payload?.countsByModelId;
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) {
    return lookup;
  }
  Object.entries(rows).forEach(([modelId, rawValue]) => {
    const normalizedModelId = normalizeCode(modelId);
    const count = asNumber(rawValue);
    if (!normalizedModelId || !Number.isFinite(count) || count < 0) {
      return;
    }
    lookup.set(normalizedModelId, count);
  });
  return lookup;
}

function buildAircraftLookupMap(payloadMap) {
  const lookup = new Map();
  if (!payloadMap || typeof payloadMap !== 'object' || Array.isArray(payloadMap)) {
    return lookup;
  }
  Object.entries(payloadMap).forEach(([key, rawValue]) => {
    const normalizedKey = normalizeCode(key);
    const normalizedValue = normalizeCode(rawValue);
    if (!normalizedKey || !normalizedValue) {
      return;
    }
    lookup.set(normalizedKey, normalizedValue);
  });
  return lookup;
}

function mergeLookupMaps(...maps) {
  const merged = new Map();
  maps.forEach((map) => {
    if (!(map instanceof Map)) {
      return;
    }
    map.forEach((value, key) => {
      if (!key || !value) {
        return;
      }
      merged.set(key, value);
    });
  });
  return merged;
}

function normalizeInferenceStatus(value) {
  const normalized = normalizeKey(value);
  if (
    normalized === 'inferred_high_confidence'
    || normalized === 'inferred_medium_confidence'
    || normalized === 'ambiguous'
    || normalized === 'unresolved'
  ) {
    return normalized;
  }
  return '';
}

function emptyConfidenceCounts() {
  return {
    manual: 0,
    high: 0,
    medium: 0,
    low: 0,
    ambiguous: 0,
  };
}

function emptyInferenceStatusCounts() {
  return {
    inferred_high_confidence: 0,
    inferred_medium_confidence: 0,
    ambiguous: 0,
    unresolved: 0,
  };
}

function buildInferenceEntry(row) {
  const registration = normalizeRegistration(row?.registration || row?.registrationRaw);
  const aircraftHex = normalizeCode(row?.aircraftHex);
  const status = normalizeInferenceStatus(row?.status);
  const reviewState = normalizeKey(row?.reviewState);
  const method = normalizeKey(row?.method);
  const confidence = asNumber(row?.confidence);
  const resolvedTypeCode = normalizeCode(row?.resolvedTypeCode);
  const reviewNote = sanitizeText(row?.reviewNote);
  const candidateTypes = asArray(row?.candidateTypes)
    .map((candidate) => normalizeCode(candidate?.typeCode))
    .filter(Boolean)
    .slice(0, 6);
  return {
    registration,
    aircraftHex,
    status,
    reviewState,
    method,
    confidence: Number.isFinite(confidence) ? confidence : null,
    resolvedTypeCode,
    reviewNote,
    candidateTypes,
  };
}

function scoreInferenceEntry(entry) {
  if (!entry) {
    return -1;
  }
  let rank = 0;
  if (entry.status === 'inferred_high_confidence') {
    rank = 4;
  } else if (entry.status === 'inferred_medium_confidence') {
    rank = 3;
  } else if (entry.status === 'ambiguous') {
    rank = 2;
  } else if (entry.status === 'unresolved') {
    rank = 1;
  }
  const confidence = Number.isFinite(entry.confidence) ? entry.confidence : 0;
  const hasResolvedType = entry.resolvedTypeCode ? 0.05 : 0;
  return rank + confidence + hasResolvedType;
}

function pickPreferredInferenceEntry(existingEntry, candidateEntry) {
  if (!existingEntry) {
    return candidateEntry;
  }
  return scoreInferenceEntry(candidateEntry) > scoreInferenceEntry(existingEntry)
    ? candidateEntry
    : existingEntry;
}

function buildInferredMappingIndex(payload) {
  const byCompositeKey = new Map();
  const byRegistration = new Map();
  const byAircraftHex = new Map();
  const statusCounts = emptyInferenceStatusCounts();
  let rowCount = 0;
  asArray(payload?.rows).forEach((row) => {
    const entry = buildInferenceEntry(row);
    if (!entry.registration && !entry.aircraftHex) {
      return;
    }
    rowCount += 1;
    if (entry.status && Object.prototype.hasOwnProperty.call(statusCounts, entry.status)) {
      statusCounts[entry.status] += 1;
    }
    const compositeKey = entry.registration || entry.aircraftHex
      ? `${entry.aircraftHex}|${entry.registration}`
      : '';
    if (compositeKey) {
      byCompositeKey.set(compositeKey, pickPreferredInferenceEntry(byCompositeKey.get(compositeKey), entry));
    }
    if (entry.registration) {
      byRegistration.set(entry.registration, pickPreferredInferenceEntry(byRegistration.get(entry.registration), entry));
    }
    if (entry.aircraftHex) {
      byAircraftHex.set(entry.aircraftHex, pickPreferredInferenceEntry(byAircraftHex.get(entry.aircraftHex), entry));
    }
  });
  return {
    rowCount,
    statusCounts,
    byCompositeKey,
    byRegistration,
    byAircraftHex,
  };
}

function findInferenceEntry(index, aircraftHex, registration) {
  if (!index) {
    return null;
  }
  const compositeKey = aircraftHex || registration ? `${aircraftHex}|${registration}` : '';
  if (compositeKey && index.byCompositeKey?.has(compositeKey)) {
    return index.byCompositeKey.get(compositeKey);
  }
  if (registration && index.byRegistration?.has(registration)) {
    return index.byRegistration.get(registration);
  }
  if (aircraftHex && index.byAircraftHex?.has(aircraftHex)) {
    return index.byAircraftHex.get(aircraftHex);
  }
  return null;
}

function confidenceFromInferenceStatus(status) {
  return INFERENCE_STATUS_CONFIDENCE_MAP[status] || 'low';
}

function isStandardTransponderHex(value) {
  return /^[0-9A-F]{6}$/.test(normalizeCode(value));
}

function issueLabelFromCode(issueCode) {
  if (issueCode === 'manual_override') {
    return 'Mapped with a manual override saved in this browser.';
  }
  if (issueCode === 'hex_reg_conflict') {
    return 'Hex and registration lookups disagree.';
  }
  if (issueCode === 'registration_fallback') {
    return 'Mapped by registration fallback (no matching hex lookup).';
  }
  if (issueCode === 'inferred_high_confidence') {
    return 'Mapped from high-confidence inference.';
  }
  if (issueCode === 'inferred_medium_confidence') {
    return 'Medium-confidence inferred ICAO candidate.';
  }
  if (issueCode === 'inference_ambiguous') {
    return 'Inference found multiple plausible ICAO candidates.';
  }
  if (issueCode === 'inference_unresolved') {
    return 'Inference could not resolve a reliable ICAO candidate.';
  }
  if (issueCode === 'missing_aircraft_id') {
    return 'No aircraftId value in the export row.';
  }
  if (issueCode === 'non_standard_hex') {
    return 'Decoded aircraftId is not a standard 6-char transponder hex.';
  }
  if (issueCode === 'missing_identifiers') {
    return 'Both registration and aircraftId are unavailable.';
  }
  if (issueCode === 'no_lookup_match') {
    return 'No local lookup match found for this row.';
  }
  return '';
}

function unique(values) {
  return Array.from(new Set(values));
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (!numeric.length) {
    return 0;
  }
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function countBy(items, selector) {
  const map = new Map();
  for (const item of items) {
    const key = selector(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function sumBy(items, keySelector, valueSelector) {
  const map = new Map();
  for (const item of items) {
    const key = keySelector(item);
    const value = valueSelector(item) || 0;
    map.set(key, (map.get(key) || 0) + value);
  }
  return map;
}

function palette(index) {
  return PROGRESS_PALETTE[index % PROGRESS_PALETTE.length];
}

function topKeyFromMap(map) {
  let best = 'unknown';
  let bestValue = -1;
  for (const [key, value] of map.entries()) {
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  }
  return best;
}

function orderedSeries(map, order, colorMap, labelFactory = (key) => key, valueFormatter = null) {
  return order
    .filter((key) => (map.get(key) || 0) > 0)
    .map((key) => {
      const value = map.get(key) || 0;
      return {
        key,
        label: labelFactory(key),
        value,
        color: colorMap[key],
        meta: valueFormatter ? valueFormatter(value, key) : '',
      };
    });
}

function rankedSeries(map, limit, colorFactory, labelFactory = (key) => key, valueFormatter = null) {
  return Array.from(map.entries())
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, limit)
    .map(([key, value], index) => ({
      key,
      label: labelFactory(key),
      value,
      color: colorFactory(index),
      meta: valueFormatter ? valueFormatter(value, key) : '',
    }));
}

function buildProgressSeries(totalMap, capturedMap, options = {}) {
  const keys = options.order?.length
    ? options.order.filter((key) => totalMap.has(key))
    : Array.from(totalMap.keys()).sort((left, right) => String(left).localeCompare(String(right)));
  const rows = keys.map((key, index) => {
    const total = totalMap.get(key) || 0;
    const captured = capturedMap.get(key) || 0;
    const remaining = Math.max(total - captured, 0);
    const percent = total ? (captured / total) * 100 : 0;
    return {
      key,
      label: options.labelFactory ? options.labelFactory(key) : key,
      captured,
      total,
      remaining,
      percent,
      color: options.colorMap?.[key] || palette(index),
    };
  });
  if (options.sortBy === 'captured') {
    rows.sort((left, right) => right.captured - left.captured || right.percent - left.percent || left.label.localeCompare(right.label));
  } else if (options.sortBy !== 'none') {
    rows.sort((left, right) => right.percent - left.percent || right.captured - left.captured || left.label.localeCompare(right.label));
  }
  if (options.limit) {
    return rows.slice(0, options.limit);
  }
  return rows;
}

function formatCountryCode(code) {
  const cleaned = normalizeCode(code);
  return regionFormatter?.of(cleaned) || cleaned || 'Unknown';
}

function formatUSStateCode(code) {
  const cleaned = normalizeCode(code);
  return US_STATE_LABELS[cleaned] || cleaned || 'Unknown';
}

function normalizeTier(value) {
  const tier = normalizeKey(value);
  return TIER_ORDER.includes(tier) ? tier : 'unknown';
}

function normalizeCategory(value) {
  const category = normalizeKey(value);
  return CATEGORY_ORDER.includes(category) ? category : 'unknown';
}

function normalizeType(value) {
  const type = normalizeCode(value);
  return TYPE_ORDER.includes(type) ? type : 'unknown';
}

function engineLabel(value) {
  return ENGINE_TYPE_LABELS[normalizeKey(value)] || formatLabel(value);
}

function buildAirportRef(row) {
  const placeCode = normalizeCode(row.placeCode);
  const countryCode = normalizeCode(placeCode.split('-')[0]);
  const rawSubdivision = normalizeCode(placeCode.split('-')[1]);
  const usStateCode = countryCode === 'US' && /^[A-Z]{2}$/.test(rawSubdivision) ? rawSubdivision : '';
  const continentKey = continentFromCountryCode(countryCode);
  return {
    id: String(row.id),
    icao: normalizeCode(row.icao),
    iata: normalizeCode(row.iata),
    name: sanitizeText(row.name),
    city: sanitizeText(row.city),
    placeCode,
    placeLabel: formatPlaceCode(placeCode),
    countryCode,
    countryLabel: formatCountryCode(countryCode),
    usStateCode,
    usStateLabel: usStateCode ? formatUSStateCode(usStateCode) : '',
    continentKey,
    continentLabel: CONTINENT_LABELS[continentKey] || CONTINENT_LABELS.unknown,
    lat: asNumber(row.lat),
    lon: asNumber(row.lon),
    alt: asNumber(row.alt),
  };
}

function buildAirportCodeIndex(allAirports) {
  const byCode = new Map();
  for (const airport of allAirports) {
    [airport.iata, airport.icao]
      .map((code) => normalizeCode(code))
      .filter(Boolean)
      .forEach((code) => {
        if (!byCode.has(code)) {
          byCode.set(code, []);
        }
        byCode.get(code).push(airport);
      });
  }
  return byCode;
}

function getCaughtRegistrationRows(payload) {
  if (Array.isArray(payload?.caughtRegistrations)) {
    return payload.caughtRegistrations;
  }
  return asArray(payload?.uniqueRegs);
}

function resolveManualRegistrationMapping(manualMappings, aircraftHex, registration) {
  if (!(manualMappings instanceof Map) || !manualMappings.size) {
    return null;
  }
  const compositeKey = buildRegistrationMappingKey(aircraftHex, registration);
  if (compositeKey && manualMappings.has(compositeKey)) {
    return manualMappings.get(compositeKey);
  }
  const normalizedRegistration = normalizeRegistration(registration);
  if (normalizedRegistration) {
    const registrationKey = `|${normalizedRegistration}`;
    if (manualMappings.has(registrationKey)) {
      return manualMappings.get(registrationKey);
    }
  }
  const normalizedHex = sanitizeText(aircraftHex).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalizedHex) {
    const hexOnlyKey = `${normalizedHex}|`;
    if (manualMappings.has(hexOnlyKey)) {
      return manualMappings.get(hexOnlyKey);
    }
  }
  return null;
}

function buildCaughtRegistrationModelCounts(payload, references, options = {}) {
  const rows = getCaughtRegistrationRows(payload);
  const byModelId = new Map();
  const transparencyRows = [];
  const seenRows = new Set();
  const lookupByHex = references.aircraftLookupByHex || new Map();
  const lookupByReg = references.aircraftLookupByReg || new Map();
  const inferredMappingsIndex = references.inferredMappingsIndex || null;
  const manualMappings = options.manualRegistrationMappings instanceof Map
    ? options.manualRegistrationMappings
    : new Map();
  const lookupAvailable = lookupByHex.size > 0 || lookupByReg.size > 0;
  const stats = {
    totalRows: 0,
    uniqueRows: 0,
    rowsWithAircraftId: 0,
    lookupAvailable,
    inferenceAvailable: Boolean(inferredMappingsIndex?.rowCount),
    mappedRows: 0,
    unmappedRows: 0,
    usedHexLookupRows: 0,
    usedRegLookupRows: 0,
    usedInferredRows: 0,
    usedManualRows: 0,
    conflictRows: 0,
    linkedInferenceRows: 0,
    confidenceCounts: emptyConfidenceCounts(),
    inferenceStatusCounts: emptyInferenceStatusCounts(),
  };

  rows.forEach((row, index) => {
    const aircraftHex = aircraftIdToHex(row?.aircraftId);
    const numericAircraftId = asNumber(row?.aircraftId);
    const aircraftId = Number.isFinite(numericAircraftId) ? Math.trunc(numericAircraftId) : null;
    const normalizedReg = normalizeRegistration(row?.reg);
    const registrationRaw = sanitizeText(row?.reg);
    const mappingKey = buildRegistrationMappingKey(aircraftHex, normalizedReg);
    const rowKey = mappingKey || `row-${index}`;
    stats.totalRows += 1;
    if (seenRows.has(rowKey)) {
      return;
    }
    seenRows.add(rowKey);
    stats.uniqueRows += 1;
    if (aircraftHex) {
      stats.rowsWithAircraftId += 1;
    }

    const inferenceEntry = findInferenceEntry(inferredMappingsIndex, aircraftHex, normalizedReg);
    if (inferenceEntry) {
      stats.linkedInferenceRows += 1;
      if (
        inferenceEntry.status
        && Object.prototype.hasOwnProperty.call(stats.inferenceStatusCounts, inferenceEntry.status)
      ) {
        stats.inferenceStatusCounts[inferenceEntry.status] += 1;
      }
    }

    const hexModelId = aircraftHex && lookupByHex.has(aircraftHex)
      ? normalizeCode(lookupByHex.get(aircraftHex))
      : '';
    const regModelId = normalizedReg && lookupByReg.has(normalizedReg)
      ? normalizeCode(lookupByReg.get(normalizedReg))
      : '';
    const hasLookupConflict = Boolean(hexModelId && regModelId && hexModelId !== regModelId);
    const manualEntry = resolveManualRegistrationMapping(manualMappings, aircraftHex, normalizedReg);
    const manualModelId = normalizeCode(
      typeof manualEntry === 'string'
        ? manualEntry
        : manualEntry?.modelId,
    );

    let autoMappedModelId = '';
    let autoMappingMethod = 'none';
    if (hexModelId) {
      autoMappedModelId = hexModelId;
      autoMappingMethod = hasLookupConflict ? 'hex_lookup_conflict' : 'hex_lookup';
      stats.usedHexLookupRows += 1;
    } else if (regModelId) {
      autoMappedModelId = regModelId;
      autoMappingMethod = 'reg_lookup';
      stats.usedRegLookupRows += 1;
    } else if (
      inferenceEntry?.status === 'inferred_high_confidence'
      && inferenceEntry?.resolvedTypeCode
    ) {
      autoMappedModelId = normalizeCode(inferenceEntry.resolvedTypeCode);
      autoMappingMethod = 'inferred_high_confidence';
      stats.usedInferredRows += 1;
    }
    const manualOverrideApplied = Boolean(manualModelId);
    const mappedModelId = manualOverrideApplied ? manualModelId : autoMappedModelId;
    const mappingMethod = manualOverrideApplied ? 'manual_override' : autoMappingMethod;

    let confidenceCategory = 'low';
    let status = 'unmapped';
    let issueCode = '';
    if (manualOverrideApplied) {
      confidenceCategory = 'manual';
      status = 'mapped';
      issueCode = 'manual_override';
      stats.usedManualRows += 1;
    } else if (hasLookupConflict) {
      confidenceCategory = 'ambiguous';
      status = 'ambiguous';
      issueCode = 'hex_reg_conflict';
      stats.conflictRows += 1;
    } else if (mappedModelId) {
      status = 'mapped';
      if (autoMappingMethod === 'reg_lookup') {
        confidenceCategory = 'medium';
        issueCode = 'registration_fallback';
      } else if (autoMappingMethod === 'inferred_high_confidence') {
        confidenceCategory = 'high';
        issueCode = 'inferred_high_confidence';
      } else {
        confidenceCategory = 'high';
      }
    } else if (inferenceEntry?.status) {
      status = inferenceEntry.status;
      confidenceCategory = confidenceFromInferenceStatus(inferenceEntry.status);
      if (inferenceEntry.status === 'inferred_medium_confidence') {
        issueCode = 'inferred_medium_confidence';
      } else if (inferenceEntry.status === 'ambiguous') {
        issueCode = 'inference_ambiguous';
      } else if (inferenceEntry.status === 'unresolved') {
        issueCode = 'inference_unresolved';
      }
    } else if (!aircraftHex && !normalizedReg) {
      issueCode = 'missing_identifiers';
    } else if (!aircraftHex && normalizedReg) {
      issueCode = 'missing_aircraft_id';
    } else if (aircraftHex && !isStandardTransponderHex(aircraftHex)) {
      issueCode = 'non_standard_hex';
    } else {
      issueCode = 'no_lookup_match';
    }

    if (Object.prototype.hasOwnProperty.call(stats.confidenceCounts, confidenceCategory)) {
      stats.confidenceCounts[confidenceCategory] += 1;
    }
    if (!mappedModelId) {
      stats.unmappedRows += 1;
    } else {
      stats.mappedRows += 1;
      byModelId.set(mappedModelId, (byModelId.get(mappedModelId) || 0) + 1);
    }

    transparencyRows.push({
      rowKey,
      registrationRaw,
      registration: normalizedReg,
      aircraftId,
      aircraftHex,
      manualMappingKey: mappingKey,
      mappedModelId,
      autoMappedModelId,
      manualOverrideModelId: manualOverrideApplied ? manualModelId : '',
      lookupHexModelId: hexModelId,
      lookupRegModelId: regModelId,
      mappingMethod,
      confidenceCategory,
      status,
      issueCode,
      issueLabel: issueLabelFromCode(issueCode),
      hasLookupConflict,
      inferenceStatus: inferenceEntry?.status || '',
      inferenceMethod: inferenceEntry?.method || '',
      inferenceConfidence: Number.isFinite(inferenceEntry?.confidence) ? inferenceEntry.confidence : null,
      inferenceResolvedTypeCode: inferenceEntry?.resolvedTypeCode || '',
      inferenceReviewState: inferenceEntry?.reviewState || '',
      inferenceReviewNote: inferenceEntry?.reviewNote || '',
      inferenceCandidateTypes: asArray(inferenceEntry?.candidateTypes).filter(Boolean).slice(0, 6),
    });
  });

  transparencyRows.sort((left, right) => {
    return (left.registration || left.registrationRaw || left.rowKey).localeCompare(
      right.registration || right.registrationRaw || right.rowKey,
    )
      || (left.aircraftHex || '').localeCompare(right.aircraftHex || '')
      || left.rowKey.localeCompare(right.rowKey);
  });

  return {
    byModelId,
    stats,
    rows: transparencyRows,
  };
}

export function parseUserCollection(text, fileName = 'upload') {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${fileName} is not valid JSON.`);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Skycards export must be a JSON object.');
  }
  const required = ['id', 'name', 'cards', 'unlockedAirportIds'];
  const missing = required.filter((key) => !(key in payload));
  if (missing.length) {
    throw new Error(`Skycards export is missing required keys: ${missing.join(', ')}`);
  }
  if (!Array.isArray(payload.cards)) {
    throw new Error('Skycards export field "cards" must be an array.');
  }
  if (!Array.isArray(payload.unlockedAirportIds)) {
    throw new Error('Skycards export field "unlockedAirportIds" must be an array.');
  }
  if (!Array.isArray(payload.uniqueRegs) && !Array.isArray(payload.caughtRegistrations)) {
    throw new Error('Skycards export must include "uniqueRegs" or "caughtRegistrations" as an array.');
  }
  return payload;
}

export function buildDashboardModel(payload, references, options = {}) {
  const cards = asArray(payload.cards).map((card, index) => {
    const model = references.modelsById.get(normalizeCode(card.modelId));
    const manufacturer = sanitizeText(card.manufacturer) || sanitizeText(model?.manufacturer) || 'Unknown';
    const name = sanitizeText(card.name) || sanitizeText(model?.name) || `Card ${index + 1}`;
    const modelId = normalizeCode(card.modelId || model?.id);
    const typeKey = normalizeType(model?.type);
    const modelImageAliases = unique(
      asArray(model?.images)
        .map((entry) => normalizeCode(entry))
        .filter(Boolean),
    );
    return {
      id: sanitizeText(card.id) || `card-${index + 1}`,
      modelId,
      modelIcao: modelId,
      modelImageOverride: normalizeCode(model?.imageOverride),
      modelImageAliases,
      manufacturer,
      name,
      displayName: [manufacturer, name].filter(Boolean).join(' '),
      xp: asNumber(card.xp) || 0,
      coverage: asNumber(card.coverage),
      cloudiness: asNumber(card.cloudiness),
      glowCount: asNumber(card.glowCount) || 0,
      tier: normalizeTier(card.tier),
      category: normalizeCategory(card.category || model?.cardCategory),
      firstFlight: asNumber(card.firstFlight) ?? asNumber(model?.firstFlight),
      rareness: asNumber(card.rareness) ?? asNumber(model?.rareness),
      wingspan: asNumber(card.wingspan) ?? asNumber(model?.wingspan),
      maxSpeed: asNumber(card.maxSpeed) ?? asNumber(model?.maxSpeed),
      seats: asNumber(card.seats) ?? asNumber(model?.seats),
      mtow: asNumber(card.mtow) ?? asNumber(model?.mtow),
      range: asNumber(model?.range),
      ceiling: asNumber(model?.ceiling),
      length: asNumber(model?.length),
      height: asNumber(model?.height),
      engNum: asNumber(model?.engNum),
      engType: normalizeKey(model?.engType),
      aircraftType: typeKey,
      aircraftTypeLabel: TYPE_LABELS[typeKey] || TYPE_LABELS.unknown,
      landingGear: sanitizeText(model?.landingGear),
      wingPosition: sanitizeText(model?.wingPos),
      wingShape: sanitizeText(model?.wingShape),
      season: asNumber(card.season),
      military: Boolean(model?.military),
      modelMatched: Boolean(model),
    };
  });
  const caughtRegistrationCounts = buildCaughtRegistrationModelCounts(payload, references, {
    manualRegistrationMappings: options.manualRegistrationMappings,
  });

  const distinctModelIds = unique(cards.map((card) => card.modelId).filter(Boolean));
  const capturedAirportIds = new Set();
  const missingAirportIds = [];
  for (const rawId of asArray(payload.unlockedAirportIds)) {
    const id = String(rawId);
    if (capturedAirportIds.has(id)) {
      continue;
    }
    capturedAirportIds.add(id);
    if (!references.airportsById.has(id)) {
      missingAirportIds.push(id);
    }
  }

  const capturedAirports = Array.from(capturedAirportIds)
    .map((id) => references.airportsById.get(id))
    .filter(Boolean);
  const allAirports = references.allAirports;
  const airportPoints = allAirports
    .filter((airport) => Number.isFinite(airport.lat) && Number.isFinite(airport.lon))
    .map((airport) => ({
      ...airport,
      captured: capturedAirportIds.has(airport.id),
      label: `${airport.icao || airport.iata || airport.id} - ${airport.name}`,
    }));

  const countryTotalCounts = countBy(allAirports, (airport) => airport.countryCode || 'unknown');
  const countryCapturedCounts = countBy(capturedAirports, (airport) => airport.countryCode || 'unknown');
  const continentTotalCounts = countBy(allAirports, (airport) => airport.continentKey || 'unknown');
  const continentCapturedCounts = countBy(capturedAirports, (airport) => airport.continentKey || 'unknown');
  const usReferenceAirports = allAirports.filter((airport) => airport.countryCode === 'US' && airport.usStateCode);
  const usCapturedAirports = capturedAirports.filter((airport) => airport.countryCode === 'US' && airport.usStateCode);
  const usStateTotalCounts = countBy(usReferenceAirports, (airport) => airport.usStateCode || 'unknown');
  const usStateCapturedCounts = countBy(usCapturedAirports, (airport) => airport.usStateCode || 'unknown');

  const countryProgress = buildProgressSeries(countryTotalCounts, countryCapturedCounts, {
    labelFactory: (key) => formatCountryCode(key),
    sortBy: 'captured',
  });
  const continentProgress = buildProgressSeries(continentTotalCounts, continentCapturedCounts, {
    order: CONTINENT_ORDER,
    colorMap: CONTINENT_COLORS,
    labelFactory: (key) => CONTINENT_LABELS[key] || CONTINENT_LABELS.unknown,
    sortBy: 'none',
  });
  const usStateProgress = buildProgressSeries(usStateTotalCounts, usStateCapturedCounts, {
    labelFactory: (key) => formatUSStateCode(key),
    sortBy: 'none',
  });

  const cardsByTier = countBy(cards, (card) => card.tier);
  const fullCoverageByTier = countBy(cards.filter((card) => (card.coverage || 0) >= 100), (card) => card.tier);
  const categoryCounts = countBy(cards, (card) => card.category);
  const manufacturerCounts = countBy(cards, (card) => card.manufacturer || 'Unknown');
  const typeCounts = countBy(cards, (card) => card.aircraftType || 'unknown');
  const tierXpMap = sumBy(cards, (card) => card.tier, (card) => card.xp);
  const tierGlowMap = sumBy(cards, (card) => card.tier, (card) => card.glowCount);
  const categoryXpMap = sumBy(cards, (card) => card.category, (card) => card.xp);

  const tierCompletion = TIER_ORDER
    .filter((key) => (cardsByTier.get(key) || 0) > 0)
    .map((key) => {
      const total = cardsByTier.get(key) || 0;
      const full = fullCoverageByTier.get(key) || 0;
      const percent = total ? (full / total) * 100 : 0;
      return {
        key,
        label: formatLabel(key),
        value: percent,
        color: TIER_COLORS[key] || TIER_COLORS.unknown,
        meta: `${full}/${total} cards at 100% coverage`,
      };
    });

  const tierXp = orderedSeries(tierXpMap, TIER_ORDER, TIER_COLORS, formatLabel, (value) => `${Math.round(value).toLocaleString('en-US')} XP`);
  const tierGlow = orderedSeries(tierGlowMap, TIER_ORDER, TIER_COLORS, formatLabel, (value) => `${Math.round(value).toLocaleString('en-US')} glows`);
  const categoryXp = orderedSeries(categoryXpMap, CATEGORY_ORDER, CATEGORY_COLORS, formatLabel, (value) => `${Math.round(value).toLocaleString('en-US')} XP`);
  const topManufacturers = rankedSeries(manufacturerCounts, 8, palette, (key) => key);
  const aircraftTypeMix = orderedSeries(typeCounts, TYPE_ORDER, TYPE_COLORS, (key) => TYPE_LABELS[key] || TYPE_LABELS.unknown);

  const referenceCategoryCounts = countBy(references.referenceModels, (row) => normalizeCategory(row.cardCategory));
  const referenceTypeCounts = countBy(references.referenceModels, (row) => normalizeType(row.type));

  const aircraftByModel = new Map();
  for (const card of cards) {
    const key = card.modelId || card.id;
    if (!aircraftByModel.has(key)) {
      aircraftByModel.set(key, {
        key,
        modelId: key,
        icao: card.modelIcao || key,
        imageOverride: card.modelImageOverride || '',
        imageAliases: new Set(asArray(card.modelImageAliases)),
        displayName: card.displayName,
        manufacturer: card.manufacturer,
        name: card.name,
        xp: 0,
        glowCount: 0,
        cardCount: 0,
        coverageTotal: 0,
        coverageCount: 0,
        cloudinessTotal: 0,
        cloudinessCount: 0,
        fullCoverageCards: 0,
        tierCounts: new Map(),
        categoryCounts: new Map(),
        typeKey: card.aircraftType || 'unknown',
        typeLabel: card.aircraftTypeLabel || TYPE_LABELS.unknown,
        maxSpeed: card.maxSpeed,
        mtow: card.mtow,
        wingspan: card.wingspan,
        seats: card.seats,
        range: card.range,
        ceiling: card.ceiling,
        length: card.length,
        height: card.height,
        firstFlight: card.firstFlight,
        rareness: card.rareness,
        engNum: card.engNum,
        engTypeLabel: engineLabel(card.engType),
        landingGear: card.landingGear,
        wingPosition: card.wingPosition,
        wingShape: card.wingShape,
        military: card.military,
        seasonMin: card.season,
        seasonMax: card.season,
      });
    }
    const row = aircraftByModel.get(key);
    row.xp += card.xp;
    row.glowCount += card.glowCount;
    row.cardCount += 1;
    if (Number.isFinite(card.coverage)) {
      row.coverageTotal += card.coverage;
      row.coverageCount += 1;
      if (card.coverage >= 100) {
        row.fullCoverageCards += 1;
      }
    }
    if (Number.isFinite(card.cloudiness)) {
      row.cloudinessTotal += card.cloudiness;
      row.cloudinessCount += 1;
    }
    row.tierCounts.set(card.tier, (row.tierCounts.get(card.tier) || 0) + 1);
    row.categoryCounts.set(card.category, (row.categoryCounts.get(card.category) || 0) + 1);
    if (Number.isFinite(card.season)) {
      row.seasonMin = row.seasonMin === null ? card.season : Math.min(row.seasonMin, card.season);
      row.seasonMax = row.seasonMax === null ? card.season : Math.max(row.seasonMax, card.season);
    }
    if (!Number.isFinite(row.rareness) && Number.isFinite(card.rareness)) {
      row.rareness = card.rareness;
    }
    if (!row.imageOverride && card.modelImageOverride) {
      row.imageOverride = card.modelImageOverride;
    }
    for (const alias of asArray(card.modelImageAliases)) {
      if (alias) {
        row.imageAliases.add(alias);
      }
    }
  }

  const aircraftRows = Array.from(aircraftByModel.values())
    .map((row) => {
      const dominantTier = topKeyFromMap(row.tierCounts);
      const dominantCategory = topKeyFromMap(row.categoryCounts);
      const avgCoverage = row.coverageCount ? row.coverageTotal / row.coverageCount : null;
      const avgCloudiness = row.cloudinessCount ? row.cloudinessTotal / row.cloudinessCount : null;
      const fullCoverageRate = row.cardCount ? (row.fullCoverageCards / row.cardCount) * 100 : 0;
      const hasMappedRows = caughtRegistrationCounts.stats.mappedRows > 0;
      const caughtRegistrations = (caughtRegistrationCounts.stats.lookupAvailable || hasMappedRows)
        ? (caughtRegistrationCounts.byModelId.get(row.modelId) || 0)
        : null;
      const possibleRegistrationsRaw = references.modelRegistrationCountsByModelId.get(row.modelId);
      const possibleRegistrations = Number.isFinite(possibleRegistrationsRaw) ? possibleRegistrationsRaw : null;
      const registrationCoverage = Number.isFinite(caughtRegistrations) && Number.isFinite(possibleRegistrations) && possibleRegistrations > 0
        ? (caughtRegistrations / possibleRegistrations) * 100
        : null;
      const imageCodes = unique([
        normalizeCode(row.icao),
        normalizeCode(row.imageOverride),
        ...Array.from(row.imageAliases).map((alias) => normalizeCode(alias)),
      ].filter(Boolean));
      return {
        key: row.key,
        modelId: row.modelId,
        icao: row.icao || row.modelId,
        imageCodes,
        displayName: row.displayName,
        manufacturer: row.manufacturer,
        name: row.name,
        xp: row.xp,
        caughtRegistrations,
        possibleRegistrations,
        registrationCoverage,
        glowCount: row.glowCount,
        cardCount: row.cardCount,
        avgCoverage,
        avgCloudiness,
        fullCoverageRate,
        dominantTier,
        dominantTierLabel: formatLabel(dominantTier),
        dominantCategory,
        dominantCategoryLabel: formatLabel(dominantCategory),
        typeKey: row.typeKey,
        typeLabel: row.typeLabel,
        maxSpeed: row.maxSpeed,
        mtow: row.mtow,
        wingspan: row.wingspan,
        seats: row.seats,
        range: row.range,
        ceiling: row.ceiling,
        length: row.length,
        height: row.height,
        firstFlight: row.firstFlight,
        rareness: row.rareness,
        engNum: row.engNum,
        engTypeLabel: row.engTypeLabel,
        landingGear: row.landingGear,
        wingPosition: row.wingPosition,
        wingShape: row.wingShape,
        military: row.military,
        seasonMin: row.seasonMin,
        seasonMax: row.seasonMax,
      };
    })
    .sort((left, right) => right.xp - left.xp || right.glowCount - left.glowCount || left.displayName.localeCompare(right.displayName));

  const observedCategoryCounts = countBy(aircraftRows, (row) => row.dominantCategory);
  const observedTypeCounts = countBy(aircraftRows, (row) => row.typeKey);
  const categoryProgress = buildProgressSeries(referenceCategoryCounts, observedCategoryCounts, {
    order: CATEGORY_ORDER,
    colorMap: CATEGORY_COLORS,
    labelFactory: (key) => formatLabel(key),
    sortBy: 'none',
  });
  const typeProgress = buildProgressSeries(referenceTypeCounts, observedTypeCounts, {
    order: TYPE_ORDER,
    colorMap: TYPE_COLORS,
    labelFactory: (key) => TYPE_LABELS[key] || TYPE_LABELS.unknown,
    sortBy: 'none',
  });

  const fullCoverageCards = cards.filter((card) => (card.coverage || 0) >= 100).length;
  const totalGlowCount = cards.reduce((sum, card) => sum + card.glowCount, 0);
  const missingModelIds = distinctModelIds.filter((modelId) => !references.modelsById.has(modelId));
  const uniqueCapturedCountries = countryProgress.filter((row) => row.captured > 0).length;
  const uniqueCapturedContinents = continentProgress.filter((row) => row.captured > 0).length;
  const uniqueCapturedUSStates = usStateProgress.filter((row) => row.captured > 0).length;
  const registrationTransparencySummary = {
    totalRows: caughtRegistrationCounts.stats.uniqueRows,
    mappedRows: caughtRegistrationCounts.stats.mappedRows,
    unmappedRows: caughtRegistrationCounts.stats.unmappedRows,
    lookupAvailable: caughtRegistrationCounts.stats.lookupAvailable,
    inferenceAvailable: caughtRegistrationCounts.stats.inferenceAvailable,
    linkedInferenceRows: caughtRegistrationCounts.stats.linkedInferenceRows,
    usedHexLookupRows: caughtRegistrationCounts.stats.usedHexLookupRows,
    usedRegLookupRows: caughtRegistrationCounts.stats.usedRegLookupRows,
    usedInferredRows: caughtRegistrationCounts.stats.usedInferredRows,
    usedManualRows: caughtRegistrationCounts.stats.usedManualRows,
    conflictRows: caughtRegistrationCounts.stats.conflictRows,
    confidenceCounts: REGISTRATION_CONFIDENCE_ORDER.reduce((accumulator, key) => {
      accumulator[key] = caughtRegistrationCounts.stats.confidenceCounts?.[key] || 0;
      return accumulator;
    }, {}),
    inferenceStatusCounts: {
      inferred_high_confidence: caughtRegistrationCounts.stats.inferenceStatusCounts?.inferred_high_confidence || 0,
      inferred_medium_confidence: caughtRegistrationCounts.stats.inferenceStatusCounts?.inferred_medium_confidence || 0,
      ambiguous: caughtRegistrationCounts.stats.inferenceStatusCounts?.ambiguous || 0,
      unresolved: caughtRegistrationCounts.stats.inferenceStatusCounts?.unresolved || 0,
    },
  };

  return {
    user: {
      id: sanitizeText(payload.id),
      name: sanitizeText(payload.name) || 'Unknown collector',
      xp: asNumber(payload.xp) || cards.reduce((sum, card) => sum + card.xp, 0),
    },
    summary: {
      totalCards: cards.length,
      observedModels: distinctModelIds.length,
      totalXp: asNumber(payload.xp) || cards.reduce((sum, card) => sum + card.xp, 0),
      averageCardXp: average(cards.map((card) => card.xp)),
      averageCoverage: average(cards.map((card) => card.coverage)),
      averageCloudiness: average(cards.map((card) => card.cloudiness)),
      fullCoverageCards,
      fullCoverageRate: cards.length ? (fullCoverageCards / cards.length) * 100 : 0,
      airportUnlocks: capturedAirportIds.size,
      totalReferenceAirports: allAirports.length,
      airportCaptureRate: allAirports.length ? (capturedAirports.length / allAirports.length) * 100 : 0,
      uniqueCapturedCountries,
      totalCountries: countryProgress.length,
      uniqueCapturedContinents,
      totalContinents: continentProgress.length,
      uniqueCapturedUSStates,
      totalUSStates: usStateProgress.length,
      totalGlowCount,
      averageAircraftXp: average(aircraftRows.map((row) => row.xp)),
      totalCaughtRegistrations: caughtRegistrationCounts.stats.uniqueRows,
      mappedCaughtRegistrations: caughtRegistrationCounts.stats.mappedRows,
      caughtRegistrationMappingRate: caughtRegistrationCounts.stats.uniqueRows
        ? (caughtRegistrationCounts.stats.mappedRows / caughtRegistrationCounts.stats.uniqueRows) * 100
        : null,
      modelsWithCaughtRegistrations: aircraftRows.filter((row) => row.caughtRegistrations > 0).length,
      modelsWithPossibleRegistrations: aircraftRows.filter(
        (row) => Number.isFinite(row.possibleRegistrations) && row.possibleRegistrations > 0,
      ).length,
      seasons: unique(cards.map((card) => card.season).filter((value) => Number.isFinite(value))),
    },
    map: {
      airportPoints,
      capturedAirports: capturedAirports.length,
      totalAirports: allAirports.length,
      missingAirports: Math.max(allAirports.length - capturedAirports.length, 0),
      continentProgress,
      countryProgress,
      usStateProgress,
    },
    aircraft: {
      rows: aircraftRows,
      topManufacturers,
      aircraftTypeMix,
      tierXp,
      tierGlow,
      categoryXp,
      tierCompletion,
      categoryProgress,
      typeProgress,
      placeholders: {
        imageResolver: 'Aircraft image resolver uses tier CDN paths with model alias fallback from reference metadata.',
        uniqueRegistrations: !caughtRegistrationCounts.stats.lookupAvailable
          ? caughtRegistrationCounts.stats.usedManualRows
            ? `${caughtRegistrationCounts.stats.mappedRows.toLocaleString('en-US')} of ${caughtRegistrationCounts.stats.uniqueRows.toLocaleString('en-US')} unique registrations mapped with browser-local manual overrides (lookup data unavailable).`
            : 'Caught registrations are present, but aircraft lookup reference data is unavailable.'
          : caughtRegistrationCounts.stats.uniqueRows
          ? `${caughtRegistrationCounts.stats.mappedRows.toLocaleString('en-US')} of ${caughtRegistrationCounts.stats.uniqueRows.toLocaleString('en-US')} unique registrations mapped via lookup, inference, or manual overrides.`
          : 'No caught registrations found in this export payload.',
      },
      registrationStats: caughtRegistrationCounts.stats,
      registrationTransparency: {
        rows: caughtRegistrationCounts.rows,
        summary: registrationTransparencySummary,
      },
    },
    reference: {
      manifest: references.manifest,
      modelsUpdatedAt: references.manifest?.datasets?.models?.updatedAt ?? references.modelsPayload.updatedAt,
      airportsUpdatedAt: references.manifest?.datasets?.airports?.updatedAt ?? references.airportsPayload.updatedAt,
      modelRegistrationCountsUpdatedAt: references.modelRegistrationCountsPayload?.generatedAt ?? null,
      aircraftLookupUpdatedAt: references.aircraftLookupPayload?.generatedAt ?? null,
      resolvedAircraftLookupUpdatedAt: references.resolvedAircraftLookupPayload?.generatedAt ?? null,
      clientVersion: references.manifest?.clientVersion || 'unknown',
    },
    quality: {
      modelCoverageRate: distinctModelIds.length ? ((distinctModelIds.length - missingModelIds.length) / distinctModelIds.length) * 100 : 100,
      airportCoverageRate: capturedAirportIds.size ? (capturedAirports.length / capturedAirportIds.size) * 100 : 100,
      missingModels: missingModelIds.length,
      missingAirports: missingAirportIds.length,
      matchedAirports: capturedAirports.length,
      distinctAirports: capturedAirportIds.size,
      registrationLookupAvailable: caughtRegistrationCounts.stats.lookupAvailable,
      registrationMappedRows: caughtRegistrationCounts.stats.mappedRows,
      registrationUnmappedRows: caughtRegistrationCounts.stats.unmappedRows,
    },
  };
}
