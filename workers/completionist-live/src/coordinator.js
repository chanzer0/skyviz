import { DurableObject } from 'cloudflare:workers';
import { buildTileArtifactKey } from './lib/keys.js';
import { buildTileKey, buildSeedTiles, canSplitTile, splitTile } from './lib/tiles.js';
import { toIsoString } from './lib/utils.js';

const GLOBAL_STATE_KEY = 'global:state';
const ACTIVE_RUN_STATUSES = new Set(['running', 'publishing']);
const TERMINAL_RUN_STATUSES = new Set(['failed', 'published', 'skipped']);

function buildRunStateKey(runId) {
  return `run:${runId}:state`;
}

function buildTileStateKey(runId, tileKey) {
  return `run:${runId}:tile:${tileKey}`;
}

function buildTileStatePrefix(runId) {
  return `run:${runId}:tile:`;
}

function buildDefaultGlobalState() {
  return {
    activeRunId: '',
    lastPublishedRunId: '',
    lastPublishedAt: '',
    lastFailedRunId: '',
    lastFailureAt: '',
  };
}

function toRunSummary(run) {
  if (!run) {
    return null;
  }
  return {
    runId: run.runId,
    status: run.status,
    scheduledTime: run.scheduledTime,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    publishedAt: run.publishedAt || '',
    generatedAt: run.generatedAt || '',
    maxRequests: run.maxRequests,
    reservedTileCount: run.reservedTileCount,
    requestAttemptCount: run.requestAttemptCount,
    seedTileCount: run.seedTileCount,
    queuedTileCount: run.queuedTileCount,
    processingTileCount: run.processingTileCount,
    completedTileCount: run.completedTileCount,
    failedTileCount: run.failedTileCount,
    cappedTileCount: run.cappedTileCount,
    splitTileCount: run.splitTileCount,
    skippedRows: run.skippedRows,
    budgetExhausted: run.budgetExhausted,
    sourceFullCountMax: run.sourceFullCountMax,
    version: run.version,
    lastError: run.lastError || '',
    manifestKey: run.manifestKey || '',
    snapshotKey: run.snapshotKey || '',
    readyToFinalize: (
      run.status === 'running'
      && run.queuedTileCount === 0
      && run.processingTileCount === 0
      && run.completedTileCount > 0
    ),
  };
}

export class CompletionistRunCoordinator extends DurableObject {
  loadGlobalState() {
    return this.ctx.storage.kv.get(GLOBAL_STATE_KEY) || buildDefaultGlobalState();
  }

  saveGlobalState(globalState) {
    this.ctx.storage.kv.put(GLOBAL_STATE_KEY, globalState);
  }

  loadRunState(runId) {
    return this.ctx.storage.kv.get(buildRunStateKey(runId));
  }

  saveRunState(runState) {
    runState.updatedAt = toIsoString();
    this.ctx.storage.kv.put(buildRunStateKey(runState.runId), runState);
    return runState;
  }

  loadTileStates(runId) {
    return Array.from(this.ctx.storage.kv.list({ prefix: buildTileStatePrefix(runId) })).map(([, value]) => value);
  }

  loadTileState(runId, tileKey) {
    return this.ctx.storage.kv.get(buildTileStateKey(runId, tileKey));
  }

  saveTileState(runId, tileState) {
    this.ctx.storage.kv.put(buildTileStateKey(runId, tileState.tileKey), tileState);
    return tileState;
  }

  initializeRun(input) {
    return this.ctx.storage.transactionSync(() => {
      const now = Date.now();
      const globalState = this.loadGlobalState();
      const existingRun = this.loadRunState(input.runId);
      if (existingRun) {
        return {
          accepted: true,
          existing: true,
          run: toRunSummary(existingRun),
          seedTiles: [],
        };
      }

      if (globalState.activeRunId && globalState.activeRunId !== input.runId) {
        const activeRun = this.loadRunState(globalState.activeRunId);
        if (activeRun && ACTIVE_RUN_STATUSES.has(activeRun.status)) {
          const updatedAtMillis = Date.parse(activeRun.updatedAt || activeRun.createdAt || '');
          const lockAgeMillis = Number.isFinite(updatedAtMillis) ? now - updatedAtMillis : Number.POSITIVE_INFINITY;
          if (lockAgeMillis < (input.runLockTimeoutSeconds * 1000)) {
            return {
              accepted: false,
              reason: 'active-run-in-progress',
              activeRunId: globalState.activeRunId,
              run: toRunSummary(activeRun),
            };
          }
          activeRun.status = 'failed';
          activeRun.lastError = 'Marked stale after exceeding the run lock timeout.';
          activeRun.failedAt = toIsoString(now);
          this.saveRunState(activeRun);
          globalState.lastFailedRunId = activeRun.runId;
          globalState.lastFailureAt = activeRun.failedAt;
          globalState.activeRunId = '';
        } else {
          globalState.activeRunId = '';
        }
      }

      let seedTiles = buildSeedTiles(input.initialTileDegrees);
      let budgetExhausted = false;
      if (seedTiles.length > input.maxRequests) {
        seedTiles = seedTiles.slice(0, input.maxRequests);
        budgetExhausted = true;
      }

      const runState = this.saveRunState({
        runId: input.runId,
        status: 'running',
        createdAt: toIsoString(now),
        updatedAt: toIsoString(now),
        scheduledTime: input.scheduledTime,
        trigger: input.trigger,
        feedUrl: input.feedUrl,
        initialTileDegrees: input.initialTileDegrees,
        minTileDegrees: input.minTileDegrees,
        maxRequests: input.maxRequests,
        requestDelaySeconds: input.requestDelaySeconds,
        uiRefreshIntervalSeconds: input.uiRefreshIntervalSeconds,
        publishIntervalSeconds: input.publishIntervalSeconds,
        staleAfterSeconds: input.staleAfterSeconds,
        runLockTimeoutSeconds: input.runLockTimeoutSeconds,
        seedTileCount: seedTiles.length,
        reservedTileCount: seedTiles.length,
        requestAttemptCount: 0,
        queuedTileCount: seedTiles.length,
        processingTileCount: 0,
        completedTileCount: 0,
        failedTileCount: 0,
        cappedTileCount: 0,
        splitTileCount: 0,
        skippedRows: 0,
        budgetExhausted,
        sourceFullCountMax: 0,
        version: null,
        lastError: '',
        manifestKey: '',
        snapshotKey: '',
        generatedAt: '',
        publishedAt: '',
      });

      seedTiles.forEach((tile) => {
        const tileKey = buildTileKey(tile);
        this.saveTileState(input.runId, {
          runId: input.runId,
          tileKey,
          tile,
          status: 'queued',
          attemptCount: 0,
          leaseToken: '',
          leaseExpiresAt: 0,
          artifactKey: '',
          rowCount: 0,
          sourceRowCount: 0,
          sourceFullCount: 0,
          skippedRows: 0,
          capped: false,
          error: '',
          createdAt: toIsoString(now),
          completedAt: '',
        });
      });

      globalState.activeRunId = input.runId;
      this.saveGlobalState(globalState);

      return {
        accepted: true,
        existing: false,
        run: toRunSummary(runState),
        seedTiles,
      };
    });
  }

  claimTile(input) {
    return this.ctx.storage.transactionSync(() => {
      const runState = this.loadRunState(input.runId);
      if (!runState) {
        return { action: 'skip', reason: 'run-not-found' };
      }
      if (TERMINAL_RUN_STATUSES.has(runState.status)) {
        return { action: 'skip', reason: runState.status };
      }

      const tileKey = buildTileKey(input.tile);
      const tileState = this.loadTileState(input.runId, tileKey);
      if (!tileState) {
        return { action: 'skip', reason: 'tile-not-found' };
      }
      if (tileState.status === 'completed') {
        return { action: 'skip', reason: 'already-complete' };
      }
      if (tileState.status === 'failed') {
        return { action: 'skip', reason: 'permanently-failed' };
      }

      const now = Date.now();
      if (
        tileState.status === 'processing'
        && tileState.leaseToken
        && tileState.leaseToken !== input.leaseToken
        && tileState.leaseExpiresAt > now
      ) {
        return { action: 'retry', delaySeconds: 5, reason: 'lease-active' };
      }

      if (tileState.status === 'queued') {
        runState.queuedTileCount = Math.max(0, runState.queuedTileCount - 1);
        runState.processingTileCount += 1;
      }

      tileState.status = 'processing';
      tileState.leaseToken = input.leaseToken;
      tileState.leaseExpiresAt = now + input.leaseDurationMs;
      tileState.attemptCount += 1;
      tileState.error = '';

      runState.requestAttemptCount += 1;

      this.saveTileState(input.runId, tileState);
      this.saveRunState(runState);

      return {
        action: 'process',
        tile: tileState.tile,
        tileKey,
        run: toRunSummary(runState),
      };
    });
  }

  completeTile(input) {
    return this.ctx.storage.transactionSync(() => {
      const runState = this.loadRunState(input.runId);
      if (!runState) {
        return { accepted: false, reason: 'run-not-found' };
      }
      const tileKey = buildTileKey(input.tile);
      const tileState = this.loadTileState(input.runId, tileKey);
      if (!tileState) {
        return { accepted: false, reason: 'tile-not-found' };
      }
      if (tileState.status === 'completed') {
        return {
          accepted: false,
          reason: 'already-complete',
          enqueueTiles: [],
          run: toRunSummary(runState),
        };
      }
      if (tileState.leaseToken !== input.leaseToken) {
        return { accepted: false, reason: 'lease-mismatch', enqueueTiles: [], run: toRunSummary(runState) };
      }

      tileState.status = 'completed';
      tileState.leaseToken = '';
      tileState.leaseExpiresAt = 0;
      tileState.artifactKey = input.artifactKey || buildTileArtifactKey(input.runId, tileKey);
      tileState.rowCount = input.rowCount;
      tileState.sourceRowCount = input.sourceRowCount;
      tileState.sourceFullCount = input.sourceFullCount;
      tileState.skippedRows = input.skippedRows;
      tileState.capped = Boolean(input.capped);
      tileState.version = input.version ?? null;
      tileState.error = '';
      tileState.completedAt = toIsoString();

      runState.processingTileCount = Math.max(0, runState.processingTileCount - 1);
      runState.completedTileCount += 1;
      runState.skippedRows += Number(input.skippedRows || 0);
      runState.sourceFullCountMax = Math.max(runState.sourceFullCountMax || 0, Number(input.sourceFullCount || 0));
      if (Number.isFinite(input.version)) {
        runState.version = Math.max(runState.version || input.version, input.version);
      }

      const enqueueTiles = [];
      if (tileState.capped) {
        runState.cappedTileCount += 1;
        if (canSplitTile(tileState.tile, runState.minTileDegrees)) {
          const childTiles = splitTile(tileState.tile)
            .filter((childTile) => !this.loadTileState(input.runId, buildTileKey(childTile)));
          if (childTiles.length > 0) {
            if ((runState.reservedTileCount + childTiles.length) <= runState.maxRequests) {
              childTiles.forEach((childTile) => {
                const childTileKey = buildTileKey(childTile);
                this.saveTileState(input.runId, {
                  runId: input.runId,
                  tileKey: childTileKey,
                  tile: childTile,
                  status: 'queued',
                  attemptCount: 0,
                  leaseToken: '',
                  leaseExpiresAt: 0,
                  artifactKey: '',
                  rowCount: 0,
                  sourceRowCount: 0,
                  sourceFullCount: 0,
                  skippedRows: 0,
                  capped: false,
                  error: '',
                  createdAt: toIsoString(),
                  completedAt: '',
                });
              });
              runState.queuedTileCount += childTiles.length;
              runState.reservedTileCount += childTiles.length;
              runState.splitTileCount += 1;
              enqueueTiles.push(...childTiles);
            } else {
              runState.budgetExhausted = true;
            }
          }
        }
      }

      this.saveTileState(input.runId, tileState);
      this.saveRunState(runState);

      return {
        accepted: true,
        enqueueTiles,
        run: toRunSummary(runState),
      };
    });
  }

  failTile(input) {
    return this.ctx.storage.transactionSync(() => {
      const globalState = this.loadGlobalState();
      const runState = this.loadRunState(input.runId);
      if (!runState) {
        return { accepted: false, reason: 'run-not-found' };
      }
      const tileKey = buildTileKey(input.tile);
      const tileState = this.loadTileState(input.runId, tileKey);
      if (!tileState) {
        return { accepted: false, reason: 'tile-not-found' };
      }
      if (tileState.status === 'completed') {
        return { accepted: false, reason: 'already-complete' };
      }
      if (tileState.leaseToken !== input.leaseToken) {
        return { accepted: false, reason: 'lease-mismatch' };
      }

      tileState.error = input.errorMessage;
      tileState.leaseToken = '';
      tileState.leaseExpiresAt = 0;
      runState.processingTileCount = Math.max(0, runState.processingTileCount - 1);

      if (input.permanent) {
        tileState.status = 'failed';
        runState.failedTileCount += 1;
        runState.status = 'failed';
        runState.lastError = input.errorMessage;
        runState.failedAt = toIsoString();
        if (globalState.activeRunId === input.runId) {
          globalState.activeRunId = '';
        }
        globalState.lastFailedRunId = input.runId;
        globalState.lastFailureAt = runState.failedAt;
        this.saveGlobalState(globalState);
      } else {
        tileState.status = 'queued';
        runState.queuedTileCount += 1;
      }

      this.saveTileState(input.runId, tileState);
      this.saveRunState(runState);

      return {
        accepted: true,
        run: toRunSummary(runState),
      };
    });
  }

  getRunStatus(runId) {
    return toRunSummary(this.loadRunState(runId));
  }

  beginPublish(runId) {
    return this.ctx.storage.transactionSync(() => {
      const runState = this.loadRunState(runId);
      if (!runState) {
        return { accepted: false, reason: 'run-not-found' };
      }
      if (runState.status === 'publishing') {
        return { accepted: true, run: toRunSummary(runState) };
      }
      if (runState.status !== 'running') {
        return { accepted: false, reason: runState.status, run: toRunSummary(runState) };
      }
      if (runState.failedTileCount > 0) {
        return { accepted: false, reason: 'run-failed', run: toRunSummary(runState) };
      }
      if (runState.processingTileCount > 0 || runState.queuedTileCount > 0 || runState.completedTileCount < 1) {
        return { accepted: false, reason: 'run-not-ready', run: toRunSummary(runState) };
      }
      runState.status = 'publishing';
      runState.publishStartedAt = toIsoString();
      this.saveRunState(runState);
      return { accepted: true, run: toRunSummary(runState) };
    });
  }

  listTileArtifacts(runId) {
    const runState = this.loadRunState(runId);
    if (!runState) {
      return { run: null, artifacts: [] };
    }
    const artifacts = this.loadTileStates(runId)
      .filter((tileState) => tileState.status === 'completed' && tileState.artifactKey)
      .sort((left, right) => left.tileKey.localeCompare(right.tileKey))
      .map((tileState) => ({
        tileKey: tileState.tileKey,
        artifactKey: tileState.artifactKey,
      }));
    return {
      run: toRunSummary(runState),
      artifacts,
    };
  }

  markPublished(input) {
    return this.ctx.storage.transactionSync(() => {
      const globalState = this.loadGlobalState();
      const runState = this.loadRunState(input.runId);
      if (!runState) {
        return { accepted: false, reason: 'run-not-found' };
      }
      runState.status = 'published';
      runState.generatedAt = input.generatedAt;
      runState.publishedAt = toIsoString();
      runState.manifestKey = input.manifestKey;
      runState.snapshotKey = input.snapshotKey;
      runState.lastError = '';
      this.saveRunState(runState);
      if (globalState.activeRunId === input.runId) {
        globalState.activeRunId = '';
      }
      globalState.lastPublishedRunId = input.runId;
      globalState.lastPublishedAt = runState.publishedAt;
      this.saveGlobalState(globalState);
      return { accepted: true, run: toRunSummary(runState) };
    });
  }

  markFailed(input) {
    return this.ctx.storage.transactionSync(() => {
      const globalState = this.loadGlobalState();
      const runState = this.loadRunState(input.runId);
      if (!runState) {
        return { accepted: false, reason: 'run-not-found' };
      }
      runState.status = 'failed';
      runState.lastError = input.errorMessage;
      runState.failedAt = toIsoString();
      this.saveRunState(runState);
      if (globalState.activeRunId === input.runId) {
        globalState.activeRunId = '';
      }
      globalState.lastFailedRunId = input.runId;
      globalState.lastFailureAt = runState.failedAt;
      this.saveGlobalState(globalState);
      return { accepted: true, run: toRunSummary(runState) };
    });
  }

  getHealth() {
    const globalState = this.loadGlobalState();
    const activeRun = globalState.activeRunId ? this.loadRunState(globalState.activeRunId) : null;
    const lastPublishedRun = globalState.lastPublishedRunId ? this.loadRunState(globalState.lastPublishedRunId) : null;
    const lastFailedRun = globalState.lastFailedRunId ? this.loadRunState(globalState.lastFailedRunId) : null;
    return {
      ok: true,
      activeRun: toRunSummary(activeRun),
      lastPublishedRun: toRunSummary(lastPublishedRun),
      lastFailedRun: toRunSummary(lastFailedRun),
      globalState,
    };
  }
}
