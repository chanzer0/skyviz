# 2026-03-23 fr24 Shared Completionist Consumer

## Status

Accepted

## Context

`fr24-discord-bot` now owns a shared Cloudflare data plane that can publish a `skyviz`-compatible derived completionist manifest. Keeping both repositories as permanent production producers would create duplicated Cloudflare operations, duplicate parity/debug work, and eventual drift between the browser contract and the richer bot-owned live-session model.

Skyviz still needs:

- a stable production manifest URL for the browser
- a local fixture path under `site/data/live/`
- a safe shadow-mode path so the fr24-derived manifest can be compared against the existing Skyviz-owned Cloudflare worker before cutover

## Decision

Treat Skyviz as the completionist consumer, not the long-term source-of-truth producer.

- `site/data/runtime-config.json` now keeps both an `activeSource` and a `shadowSource`.
- The browser reads only the active source during normal use.
- Query-string overrides may force `completionistSource=active`, `completionistSource=shadow`, or one explicit `completionistManifestUrl` for parity/debug work.
- `scripts/compare_completionist_sources.py` is the repo-local parity tool for comparing the runtime-config active and shadow sources.
- `workers/completionist-live/` remains available only as the legacy Skyviz-owned producer until the fr24-derived source has passed parity checks and burn-in.

## Consequences

- Skyviz keeps a clean consumer boundary while `fr24-discord-bot` becomes the shared live-data producer.
- Production source changes become config flips in `site/data/runtime-config.json`, not browser-code rewrites.
- Local preview remains stable because localhost still defaults to `site/data/live/`.
- The repo now needs explicit docs and checks so active/shadow source drift is visible before production cutover.
- The legacy Skyviz worker can be retired after parity approval and a successful burn-in on the fr24-derived source.
