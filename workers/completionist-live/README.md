# Completionist Live Worker

Cloudflare owns the legacy Skyviz completionist refresh path that is now kept only for shadow-mode parity during the fr24 shared-data cutover.

## Account lock

All Cloudflare write operations for this worker must target:

- email: `seansailer28@gmail.com`
- account id: `172da47da00e3b33810d2e9c73c9a0b9`

Verify that first:

```bash
python scripts/check_cloudflare_account.py
```

Do not run `wrangler deploy`, `wrangler r2 ...`, or `wrangler queues ...` until that check passes.

## Resources

- Worker: `skyviz-completionist-live`
- R2 bucket: `skyviz-completionist-live`
- Queue: `skyviz-completionist-tile-fetch`
- Dead-letter queue: `skyviz-completionist-tile-dlq`
- Workflow binding: `COMPLETIONIST_REFRESH_WORKFLOW`
- Durable Object class: `CompletionistRunCoordinator`

## Provision / deploy

From the repository root:

```bash
python scripts/check_cloudflare_account.py
cd workers/completionist-live
npx wrangler r2 bucket create skyviz-completionist-live --config wrangler.provision.jsonc
npx wrangler queues create skyviz-completionist-tile-fetch --config wrangler.provision.jsonc --message-retention-period-secs 86400
npx wrangler queues create skyviz-completionist-tile-dlq --config wrangler.provision.jsonc --message-retention-period-secs 86400
npx wrangler deploy
```

During burn-in, keep this worker configured as the `skyvizLegacy` shadow/rollback source in [`runtime-config.json`](/D:/Repositories/skyviz/site/data/runtime-config.json):

- `/live/completionist-manifest.json`

The browser resolves versioned snapshot paths from that manifest at runtime.

The runtime deletes per-tile staging artifacts after a successful publish and prunes older versioned run artifacts on a short retention window.

## Local development

- Production completionist reads now default to `fr24Shared` in [`runtime-config.json`](/D:/Repositories/skyviz/site/data/runtime-config.json); this worker remains available as the `skyvizLegacy` shadow source during burn-in.
- Local preview on `localhost` or `file:` always prefers `site/data/live/completionist-manifest.json`.
- `scripts/refresh_completionist_snapshot.py` remains the local fixture generator for that path.
