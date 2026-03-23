import { WorkflowEntrypoint } from 'cloudflare:workers';
import { buildAndPublishRun, enqueueTileMessages, getCoordinatorStub } from './pipeline.js';
import { getPipelineSettings } from './lib/config.js';

export class CompletionistRefreshWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const coordinator = getCoordinatorStub(this.env);
    const settings = getPipelineSettings(this.env);
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {};
    const runId = String(payload.runId || event?.instanceId || '').trim();
    if (!runId) {
      throw new Error('Workflow payload is missing runId');
    }
    const scheduledTime = payload.scheduledTime || event?.timestamp?.toISOString?.() || '';
    const trigger = String(payload.trigger || 'workflow').trim() || 'workflow';

    const initialization = await step.do('initialize run', async () => coordinator.initializeRun({
      runId,
      scheduledTime,
      trigger,
      ...settings,
    }));
    if (!initialization.accepted) {
      return {
        ok: false,
        skipped: true,
        reason: initialization.reason || 'run-not-accepted',
        activeRunId: initialization.activeRunId || '',
      };
    }

    if (!initialization.existing && initialization.seedTiles.length) {
      await step.do('enqueue seed tiles', async () => {
        await enqueueTileMessages(this.env.TILE_QUEUE, runId, initialization.seedTiles);
        return { count: initialization.seedTiles.length };
      });
    }

    const maxPollAttempts = Math.max(
      3,
      Math.ceil(settings.runLockTimeoutSeconds / settings.workflowPollSeconds),
    );

    let status = initialization.run;
    for (let pollIndex = 0; pollIndex < maxPollAttempts; pollIndex += 1) {
      status = await step.do(`poll run ${pollIndex}`, async () => coordinator.getRunStatus(runId));
      if (!status) {
        throw new Error(`Run ${runId} disappeared during workflow execution`);
      }
      if (status.status === 'failed') {
        return {
          ok: false,
          skipped: false,
          reason: status.lastError || 'run-failed',
          run: status,
        };
      }
      if (status.readyToFinalize) {
        break;
      }
      if (pollIndex === maxPollAttempts - 1) {
        throw new Error(`Run ${runId} did not reach a finalizable state before the workflow poll limit`);
      }
      await step.sleep(`wait for queue drain ${pollIndex}`, `${settings.workflowPollSeconds} seconds`);
    }

    const beginPublish = await step.do('begin publish', async () => coordinator.beginPublish(runId));
    if (!beginPublish.accepted) {
      return {
        ok: false,
        skipped: true,
        reason: beginPublish.reason || 'publish-not-started',
        run: beginPublish.run || null,
      };
    }

    try {
      const published = await step.do('publish run', async () => buildAndPublishRun(this.env, runId));
      await step.do('mark published', async () => coordinator.markPublished({
        runId,
        generatedAt: published.generatedAt,
        manifestKey: published.manifestKey,
        snapshotKey: published.snapshotKey,
      }));
      return {
        ok: true,
        runId,
        published,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to publish completionist run';
      await step.do('mark failed', async () => coordinator.markFailed({
        runId,
        errorMessage: message,
      }));
      throw error;
    }
  }
}
