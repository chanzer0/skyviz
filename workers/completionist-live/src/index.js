import { handleFetchRequest, handleQueueBatch, startScheduledWorkflow } from './pipeline.js';

export { CompletionistRunCoordinator } from './coordinator.js';
export { CompletionistRefreshWorkflow } from './workflow.js';

export default {
  async fetch(request, env) {
    return handleFetchRequest(request, env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(startScheduledWorkflow(env, event.scheduledTime, 'cron'));
  },

  async queue(batch, env) {
    await handleQueueBatch(batch, env);
  },
};
