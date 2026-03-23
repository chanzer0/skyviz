import {
  CURRENT_MANIFEST_KEY,
  HEALTH_ROUTE,
  LIVE_MANIFEST_ROUTE,
  LIVE_RUNS_ROUTE_PREFIX,
  MAX_TILE_RETRY_ATTEMPTS,
  TILE_LEASE_WINDOW_MS,
  COORDINATOR_NAME,
} from './lib/constants.js';
import { buildManifestPayload, buildSnapshotPayload } from './lib/contract.js';
import { buildTileArtifact, fetchFeedPayload, mergeRows, rowFromList, rowToList } from './lib/feed.js';
import {
  buildErrorMessage,
  chunkArray,
  stringifyJson,
  toIsoString,
} from './lib/utils.js';
import {
  buildLiveRunManifestPath,
  buildLiveRunSnapshotPath,
  buildRunPrefix,
  buildRunIdForScheduledTime,
  buildStableManifestKey,
  buildStableSnapshotPath,
  buildTileArtifactKey,
  buildVersionedManifestKey,
  buildVersionedSnapshotKey,
} from './lib/keys.js';
import { buildTileKey, buildTileMessage, normalizeTile } from './lib/tiles.js';
import { getPipelineSettings } from './lib/config.js';
import {
  buildRootStatus,
  isLiveRequestPath,
  jsonResponse,
  optionsResponse,
  r2JsonResponse,
} from './lib/http.js';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getCoordinatorStub(env) {
  const id = env.RUN_COORDINATOR.idFromName(COORDINATOR_NAME);
  return env.RUN_COORDINATOR.get(id);
}

export async function enqueueTileMessages(queue, runId, tiles) {
  const messages = tiles.map((tile) => ({ body: buildTileMessage(runId, tile) }));
  for (const batch of chunkArray(messages, 100)) {
    await queue.sendBatch(batch);
  }
}

export async function startScheduledWorkflow(env, scheduledTime, trigger = 'cron') {
  const runId = buildRunIdForScheduledTime(scheduledTime);
  try {
    const instance = await env.COMPLETIONIST_REFRESH_WORKFLOW.create({
      id: runId,
      params: {
        runId,
        scheduledTime,
        trigger,
      },
    });
    return { ok: true, runId: instance.id };
  } catch (error) {
    const message = buildErrorMessage(error);
    if (message.toLowerCase().includes('already exists')) {
      return { ok: true, runId, existing: true };
    }
    throw error;
  }
}

function shouldRetryTileError(errorMessage, attempts) {
  if (attempts >= MAX_TILE_RETRY_ATTEMPTS) {
    return false;
  }
  return !/failed \(4\d\d\)/i.test(errorMessage) || /failed \(429\)/i.test(errorMessage);
}

function computeRetryDelaySeconds(attempts) {
  return Math.min(30 * (2 ** Math.max(attempts, 0)), 600);
}

function parseRunTimestamp(runId) {
  const match = /(\d{8})T(\d{6})Z$/.exec(String(runId || '').trim());
  if (!match) {
    return null;
  }
  const [, datePart, timePart] = match;
  const isoString = (
    `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`
    + `T${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}.000Z`
  );
  const parsed = Date.parse(isoString);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRunIdFromObjectKey(key) {
  const prefix = 'live/runs/';
  if (!String(key || '').startsWith(prefix)) {
    return '';
  }
  const remainder = key.slice(prefix.length);
  const slashIndex = remainder.indexOf('/');
  if (slashIndex <= 0) {
    return '';
  }
  return decodeURIComponent(remainder.slice(0, slashIndex));
}

async function deleteKeys(bucket, keys) {
  for (const batch of chunkArray(keys, 1000)) {
    await bucket.delete(batch);
  }
}

async function pruneOldRunArtifacts(bucket, currentRunId, retentionHours) {
  const cutoff = Date.now() - (retentionHours * 60 * 60 * 1000);
  const staleKeys = [];
  let cursor;
  do {
    const page = await bucket.list({
      prefix: 'live/runs/',
      cursor,
    });
    page.objects.forEach((object) => {
      const runId = extractRunIdFromObjectKey(object.key);
      if (!runId || runId === currentRunId) {
        return;
      }
      const runTimestamp = parseRunTimestamp(runId);
      if (runTimestamp !== null && runTimestamp < cutoff) {
        staleKeys.push(object.key);
      }
    });
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  if (!staleKeys.length) {
    return 0;
  }
  await deleteKeys(bucket, staleKeys);
  return staleKeys.length;
}

export async function handleQueueBatch(batch, env) {
  const settings = getPipelineSettings(env);
  const coordinator = getCoordinatorStub(env);

  for (const message of batch.messages) {
    const runId = String(message.body?.runId || '').trim();
    const tile = normalizeTile(message.body?.tile);
    if (!runId || !tile) {
      message.ack();
      continue;
    }

    const tileKey = buildTileKey(tile);
    const leaseToken = `${message.id}:${message.attempts}`;
    const claim = await coordinator.claimTile({
      runId,
      tile,
      leaseToken,
      leaseDurationMs: TILE_LEASE_WINDOW_MS,
    });

    if (claim.action === 'skip') {
      message.ack();
      continue;
    }
    if (claim.action === 'retry') {
      message.retry({ delaySeconds: claim.delaySeconds || 5 });
      continue;
    }

    try {
      const payload = await fetchFeedPayload(settings.feedUrl, tile);
      const tileArtifact = buildTileArtifact(tile, payload);
      const artifactKey = buildTileArtifactKey(runId, tileKey);
      await env.COMPLETIONIST_BUCKET.put(artifactKey, stringifyJson(tileArtifact), {
        httpMetadata: {
          contentType: 'application/json',
          cacheControl: 'public, max-age=300, immutable',
        },
      });
      const completion = await coordinator.completeTile({
        runId,
        tile,
        leaseToken,
        artifactKey,
        rowCount: tileArtifact.rowCount,
        sourceRowCount: tileArtifact.sourceRowCount,
        sourceFullCount: tileArtifact.sourceFullCount,
        skippedRows: tileArtifact.skippedRows,
        capped: tileArtifact.capped,
        version: tileArtifact.version,
      });
      if (completion.enqueueTiles?.length) {
        await enqueueTileMessages(env.TILE_QUEUE, runId, completion.enqueueTiles);
      }
      message.ack();
    } catch (error) {
      const errorMessage = buildErrorMessage(error);
      const retryable = shouldRetryTileError(errorMessage, message.attempts);
      await coordinator.failTile({
        runId,
        tile,
        leaseToken,
        errorMessage,
        permanent: !retryable,
      });
      if (retryable) {
        message.retry({ delaySeconds: computeRetryDelaySeconds(message.attempts) });
      } else {
        message.ack();
      }
    }

    if (settings.requestDelaySeconds > 0) {
      await sleep(settings.requestDelaySeconds * 1000);
    }
  }
}

export async function buildAndPublishRun(env, runId) {
  const settings = getPipelineSettings(env);
  const coordinator = getCoordinatorStub(env);
  const artifactsResult = await coordinator.listTileArtifacts(runId);
  if (!artifactsResult.run) {
    throw new Error(`Run ${runId} does not exist`);
  }
  if (!artifactsResult.artifacts.length) {
    throw new Error(`Run ${runId} has no completed tile artifacts`);
  }

  const rowsById = new Map();
  for (const artifactRef of artifactsResult.artifacts) {
    const object = await env.COMPLETIONIST_BUCKET.get(artifactRef.artifactKey);
    if (!object) {
      throw new Error(`Missing tile artifact ${artifactRef.artifactKey}`);
    }
    const artifact = JSON.parse(await object.text());
    for (const rawRow of artifact.rows || []) {
      const row = rowFromList(rawRow, artifact.fields);
      if (!row.flightId) {
        continue;
      }
      const existingRow = rowsById.get(row.flightId);
      rowsById.set(row.flightId, existingRow ? mergeRows(existingRow, row) : row);
    }
  }

  const generatedAt = toIsoString();
  const orderedRows = Array.from(rowsById.keys())
    .sort()
    .map((flightId) => rowToList(rowsById.get(flightId)));

  const versionedSnapshotKey = buildVersionedSnapshotKey(runId);
  const versionedManifestKey = buildVersionedManifestKey(runId);
  const stableManifestKey = buildStableManifestKey();
  const snapshot = buildSnapshotPayload({
    generatedAt,
    rows: orderedRows,
    runId,
  });
  const versionedManifest = buildManifestPayload({
    generatedAt,
    snapshotPath: './completionist-snapshot.json',
    rowCount: orderedRows.length,
    uiRefreshIntervalSeconds: settings.uiRefreshIntervalSeconds,
    publishIntervalSeconds: settings.publishIntervalSeconds,
    staleAfterSeconds: settings.staleAfterSeconds,
    runId,
    budgetExhausted: artifactsResult.run.budgetExhausted,
  });
  const stableManifest = buildManifestPayload({
    generatedAt,
    snapshotPath: buildStableSnapshotPath(runId),
    rowCount: orderedRows.length,
    uiRefreshIntervalSeconds: settings.uiRefreshIntervalSeconds,
    publishIntervalSeconds: settings.publishIntervalSeconds,
    staleAfterSeconds: settings.staleAfterSeconds,
    runId,
    budgetExhausted: artifactsResult.run.budgetExhausted,
  });

  await env.COMPLETIONIST_BUCKET.put(versionedSnapshotKey, stringifyJson(snapshot), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  await env.COMPLETIONIST_BUCKET.put(versionedManifestKey, stringifyJson(versionedManifest), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  await env.COMPLETIONIST_BUCKET.put(stableManifestKey, stringifyJson(stableManifest), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'no-store',
    },
  });

  const tileArtifactKeys = artifactsResult.artifacts
    .map((artifact) => artifact.artifactKey)
    .filter(Boolean);
  let deletedTileArtifactCount = 0;
  if (tileArtifactKeys.length) {
    try {
      await deleteKeys(env.COMPLETIONIST_BUCKET, tileArtifactKeys);
      deletedTileArtifactCount = tileArtifactKeys.length;
    } catch (error) {
      console.warn(`Failed to delete tile artifacts for ${runId}: ${buildErrorMessage(error)}`);
    }
  }

  let prunedObjectCount = 0;
  try {
    prunedObjectCount = await pruneOldRunArtifacts(
      env.COMPLETIONIST_BUCKET,
      runId,
      settings.runRetentionHours,
    );
  } catch (error) {
    console.warn(`Failed to prune stale run artifacts after ${runId}: ${buildErrorMessage(error)}`);
  }

  return {
    generatedAt,
    rowCount: orderedRows.length,
    manifestKey: stableManifestKey,
    snapshotKey: versionedSnapshotKey,
    versionedManifestKey,
    versionedManifestPath: buildLiveRunManifestPath(runId),
    versionedSnapshotPath: buildLiveRunSnapshotPath(runId),
    deletedTileArtifactCount,
    prunedObjectCount,
  };
}

export async function handleFetchRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS' && isLiveRequestPath(url.pathname)) {
    return optionsResponse();
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  if (url.pathname === '/') {
    return jsonResponse(buildRootStatus(url.origin));
  }

  if (url.pathname === HEALTH_ROUTE) {
    const coordinator = getCoordinatorStub(env);
    const settings = getPipelineSettings(env);
    return jsonResponse({
      ...(await coordinator.getHealth()),
      settings,
      manifestUrl: `${url.origin}${LIVE_MANIFEST_ROUTE}`,
    });
  }

  if (url.pathname === LIVE_MANIFEST_ROUTE) {
    const object = await env.COMPLETIONIST_BUCKET.get(CURRENT_MANIFEST_KEY);
    return r2JsonResponse(object, { cacheControl: 'no-store' });
  }

  if (url.pathname.startsWith(LIVE_RUNS_ROUTE_PREFIX)) {
    const relativePath = url.pathname.slice(1);
    const object = await env.COMPLETIONIST_BUCKET.get(relativePath);
    return r2JsonResponse(object, { cacheControl: 'public, max-age=31536000, immutable' });
  }

  return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
}
