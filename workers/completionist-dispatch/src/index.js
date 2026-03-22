const GITHUB_API_BASE_URL = 'https://api.github.com';
const USER_AGENT = 'skyviz-completionist-dispatch-worker';

export default {
  async fetch(_request, env) {
    return Response.json({
      ok: true,
      worker: 'skyviz-completionist-dispatch',
      workflow: env.GITHUB_WORKFLOW_ID ?? 'refresh-completionist-pages.yml',
      repo: `${env.GITHUB_OWNER ?? 'chanzer0'}/${env.GITHUB_REPO ?? 'skyviz'}`,
      schedule: '*/5 * * * *',
    });
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(dispatchCompletionistRefresh(env));
  },
};

async function dispatchCompletionistRefresh(env) {
  const owner = env.GITHUB_OWNER ?? 'chanzer0';
  const repo = env.GITHUB_REPO ?? 'skyviz';
  const workflowId = env.GITHUB_WORKFLOW_ID ?? 'refresh-completionist-pages.yml';
  const ref = env.GITHUB_REF ?? 'main';
  const triggerSource = env.TRIGGER_SOURCE ?? 'cloudflare-cron';
  const token = env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN worker secret.');
  }

  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref,
        inputs: {
          trigger_source: triggerSource,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${errorText}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      owner,
      repo,
      workflowId,
      ref,
      triggerSource,
      dispatchedAt: new Date().toISOString(),
    }),
  );
}
