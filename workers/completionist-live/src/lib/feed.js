import {
  DEFAULT_FEED_PARAMS,
  FEED_CAP_THRESHOLD,
  REQUEST_HEADERS,
  SNAPSHOT_FIELDS,
} from './constants.js';
import {
  asFloat,
  asInt,
  normalizeCode,
  normalizeText,
  toIsoString,
} from './utils.js';
import { formatBounds } from './tiles.js';

export function buildFeedUrl(baseUrl, extraParams = {}) {
  const url = new URL(baseUrl);
  const params = new URLSearchParams(url.search);
  Object.entries(DEFAULT_FEED_PARAMS).forEach(([key, value]) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });
  Object.entries(extraParams).forEach(([key, value]) => {
    params.set(key, value);
  });
  url.search = params.toString();
  return url.toString();
}

export async function fetchFeedPayload(feedUrl, tile) {
  const url = buildFeedUrl(feedUrl, { bounds: formatBounds(tile) });
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status}) for ${formatBounds(tile)}`);
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Feed payload was not a JSON object');
  }
  return payload;
}

export function iterFeedRows(payload) {
  return Object.entries(payload).filter(([, value]) => Array.isArray(value));
}

export function normalizeFeedRow(flightId, rawRow) {
  const latitude = asFloat(rawRow[1]);
  const longitude = asFloat(rawRow[2]);
  if (latitude === null || longitude === null) {
    return null;
  }
  return {
    flightId: normalizeText(flightId),
    aircraftHex: normalizeCode(rawRow[0]),
    lat: latitude,
    lon: longitude,
    track: asInt(rawRow[3]),
    altitude: asInt(rawRow[4]),
    speed: asInt(rawRow[5]),
    typeCode: normalizeCode(rawRow[8]),
    registration: normalizeCode(rawRow[9]),
    seenAt: asInt(rawRow[10]),
    origin: normalizeCode(rawRow[11]),
    destination: normalizeCode(rawRow[12]),
    flightNumber: normalizeCode(rawRow[13]),
    callsign: normalizeCode(rawRow[16] ?? rawRow[13]),
  };
}

export function rowCompleteness(row) {
  return SNAPSHOT_FIELDS.reduce(
    (count, field) => (field !== 'flightId' && row[field] !== null && row[field] !== '' ? count + 1 : count),
    0,
  );
}

export function mergeRows(existingRow, incomingRow) {
  const existingKey = [(existingRow.seenAt ?? -1), rowCompleteness(existingRow)];
  const incomingKey = [(incomingRow.seenAt ?? -1), rowCompleteness(incomingRow)];
  const [primary, secondary] = incomingKey[0] > existingKey[0]
    || (incomingKey[0] === existingKey[0] && incomingKey[1] >= existingKey[1])
    ? [incomingRow, existingRow]
    : [existingRow, incomingRow];
  const merged = { ...primary };
  SNAPSHOT_FIELDS.forEach((field) => {
    if (field !== 'flightId' && (merged[field] === null || merged[field] === '')) {
      merged[field] = secondary[field];
    }
  });
  return merged;
}

export function rowToList(row) {
  return SNAPSHOT_FIELDS.map((field) => row[field] ?? null);
}

export function rowFromList(rawRow, fields = SNAPSHOT_FIELDS) {
  const fieldIndex = new Map(fields.map((field, index) => [field, index]));
  const readValue = (field) => rawRow[fieldIndex.get(field) ?? -1];
  return {
    flightId: normalizeText(readValue('flightId')),
    aircraftHex: normalizeCode(readValue('aircraftHex')),
    lat: asFloat(readValue('lat')),
    lon: asFloat(readValue('lon')),
    track: asInt(readValue('track')),
    altitude: asInt(readValue('altitude')),
    speed: asInt(readValue('speed')),
    typeCode: normalizeCode(readValue('typeCode')),
    registration: normalizeCode(readValue('registration')),
    seenAt: asInt(readValue('seenAt')),
    origin: normalizeCode(readValue('origin')),
    destination: normalizeCode(readValue('destination')),
    flightNumber: normalizeCode(readValue('flightNumber')),
    callsign: normalizeCode(readValue('callsign')),
  };
}

export function buildTileArtifact(tile, payload) {
  const rowsById = new Map();
  let skippedRows = 0;
  let tileRowCount = 0;

  iterFeedRows(payload).forEach(([flightId, rawRow]) => {
    const normalizedRow = normalizeFeedRow(flightId, rawRow);
    if (!normalizedRow) {
      skippedRows += 1;
      return;
    }
    tileRowCount += 1;
    const existingRow = rowsById.get(normalizedRow.flightId);
    rowsById.set(
      normalizedRow.flightId,
      existingRow ? mergeRows(existingRow, normalizedRow) : normalizedRow,
    );
  });

  return {
    schemaVersion: 1,
    generatedAt: toIsoString(),
    fields: SNAPSHOT_FIELDS,
    tile,
    rowCount: rowsById.size,
    sourceRowCount: tileRowCount,
    skippedRows,
    capped: tileRowCount >= FEED_CAP_THRESHOLD,
    sourceFullCount: asInt(payload.full_count) ?? 0,
    version: asInt(payload.version),
    rows: Array.from(rowsById.values()).map(rowToList),
  };
}
