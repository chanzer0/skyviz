import test from 'node:test';
import assert from 'node:assert/strict';

import { buildManifestPayload, buildSnapshotPayload } from '../src/lib/contract.js';
import { buildTileArtifact, mergeRows, rowFromList, rowToList } from '../src/lib/feed.js';
import { buildSeedTiles, buildTileKey, splitTile } from '../src/lib/tiles.js';

test('tile helpers remain deterministic', () => {
  const tiles = buildSeedTiles(60);
  assert.equal(tiles.length, 18);
  assert.equal(buildTileKey(tiles[0]), 'nm30p0000_sm90p0000_wm180p0000_em120p0000');
  assert.equal(splitTile(tiles[0]).length, 4);
});

test('tile artifact normalizes and dedupes feed rows', () => {
  const artifact = buildTileArtifact(
    { south: 0, north: 1, west: 2, east: 3 },
    {
      full_count: 2,
      version: 7,
      abc123: ['a0', 41.5, -87.6, 180, 35000, 420, null, null, 'B738', 'N123AA', 1710000000, 'KORD', 'KLAX', 'AA123', null, null, 'AAL123'],
      abc123_duplicate: ['a0', 41.5, -87.6, 180, 35000, 420, null, null, 'B738', 'N123AA', 1710000001, 'KORD', 'KLAX', 'AA123', null, null, 'AAL123'],
      def456: ['b0', null, -87.6, 180, 35000, 420, null, null, 'A320', 'N999ZZ', 1710000000, 'KORD', 'KLAX', 'ZZ999', null, null, 'ZZZ999'],
    },
  );

  assert.equal(artifact.sourceRowCount, 2);
  assert.equal(artifact.rowCount, 2);
  assert.equal(artifact.skippedRows, 0);
  assert.equal(artifact.version, 7);
});

test('row helpers round-trip snapshot rows', () => {
  const row = {
    flightId: 'abc123',
    aircraftHex: 'A0',
    lat: 41.5,
    lon: -87.6,
    track: 180,
    altitude: 35000,
    speed: 420,
    typeCode: 'B738',
    registration: 'N123AA',
    seenAt: 1710000000,
    origin: 'KORD',
    destination: 'KLAX',
    flightNumber: 'AA123',
    callsign: 'AAL123',
  };
  const roundTrip = rowFromList(rowToList(row));
  assert.deepEqual(roundTrip, row);
});

test('mergeRows prefers newer or more complete rows', () => {
  const older = rowFromList(['abc', 'A0', 41.5, -87.6, 180, 35000, 420, 'B738', 'N123AA', 100, 'KORD', '', 'AA123', 'AAL123']);
  const newer = rowFromList(['abc', 'A0', 41.5, -87.6, 180, 35000, 420, 'B738', 'N123AA', 101, 'KORD', 'KLAX', 'AA123', 'AAL123']);
  const merged = mergeRows(older, newer);
  assert.equal(merged.destination, 'KLAX');
  assert.equal(merged.seenAt, 101);
});

test('manifest and snapshot builders preserve the browser contract', () => {
  const generatedAt = '2026-03-23T17:00:00.000Z';
  const snapshot = buildSnapshotPayload({
    generatedAt,
    runId: 'completionist-20260323T170000Z',
    rows: [['abc123', 'A0', 41.5, -87.6, 180, 35000, 420, 'B738', 'N123AA', 1710000000, 'KORD', 'KLAX', 'AA123', 'AAL123']],
  });
  const manifest = buildManifestPayload({
    generatedAt,
    runId: 'completionist-20260323T170000Z',
    snapshotPath: './runs/completionist-20260323T170000Z/completionist-snapshot.json',
    rowCount: 1,
    uiRefreshIntervalSeconds: 60,
    publishIntervalSeconds: 300,
    staleAfterSeconds: 900,
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.rowCount, 1);
  assert.equal(manifest.snapshotPath, './runs/completionist-20260323T170000Z/completionist-snapshot.json');
});
