import { CURRENT_MANIFEST_KEY } from './constants.js';

export function buildRunIdForScheduledTime(scheduledTime) {
  const date = new Date(scheduledTime);
  const parts = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    'T',
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0'),
    'Z',
  ];
  return `completionist-${parts.join('')}`;
}

export function buildRunPrefix(runId) {
  return `live/runs/${runId}`;
}

export function buildTileArtifactKey(runId, tileKey) {
  return `${buildRunPrefix(runId)}/tiles/${tileKey}.json`;
}

export function buildVersionedManifestKey(runId) {
  return `${buildRunPrefix(runId)}/completionist-manifest.json`;
}

export function buildVersionedSnapshotKey(runId) {
  return `${buildRunPrefix(runId)}/completionist-snapshot.json`;
}

export function buildStableManifestKey() {
  return CURRENT_MANIFEST_KEY;
}

export function buildStableSnapshotPath(runId) {
  return `./runs/${encodeURIComponent(runId)}/completionist-snapshot.json`;
}

export function buildLiveRunManifestPath(runId) {
  return `/live/runs/${encodeURIComponent(runId)}/completionist-manifest.json`;
}

export function buildLiveRunSnapshotPath(runId) {
  return `/live/runs/${encodeURIComponent(runId)}/completionist-snapshot.json`;
}
