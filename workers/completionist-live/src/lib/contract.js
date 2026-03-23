import { SNAPSHOT_FIELDS } from './constants.js';

export function buildSnapshotPayload({
  generatedAt,
  rows,
  fields = SNAPSHOT_FIELDS,
  runId = '',
}) {
  const payload = {
    schemaVersion: 1,
    generatedAt,
    fields,
    rows,
  };
  if (runId) {
    payload.runId = runId;
  }
  return payload;
}

export function buildManifestPayload({
  generatedAt,
  snapshotPath,
  rowCount,
  fields = SNAPSHOT_FIELDS,
  uiRefreshIntervalSeconds,
  publishIntervalSeconds,
  staleAfterSeconds,
  runId = '',
  budgetExhausted = false,
}) {
  const payload = {
    schemaVersion: 1,
    generatedAt,
    snapshotPath,
    fields,
    rowCount,
    uiRefreshIntervalSeconds,
    publishIntervalSeconds,
    staleAfterSeconds,
  };
  if (runId) {
    payload.runId = runId;
  }
  if (budgetExhausted) {
    payload.budgetExhausted = true;
  }
  return payload;
}
