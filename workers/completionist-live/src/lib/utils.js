export function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return String(value).trim();
}

export function normalizeCode(value) {
  return normalizeText(value).toUpperCase();
}

export function asFloat(value) {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function asInt(value) {
  const numericValue = Number.parseInt(String(value), 10);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function coercePositiveNumber(value, fallback, minimum = Number.EPSILON) {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) && numericValue >= minimum ? numericValue : fallback;
}

export function coercePositiveInteger(value, fallback, minimum = 1) {
  const numericValue = Number.parseInt(String(value), 10);
  return Number.isFinite(numericValue) && numericValue >= minimum ? numericValue : fallback;
}

export function buildErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return normalizeText(error) || 'Unknown error';
}

export function toIsoString(value = Date.now()) {
  return new Date(value).toISOString();
}

export function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function stringifyJson(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}
