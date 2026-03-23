# 2026-03-23 Cloudflare Completionist Data Plane

## Goal

Replace the completionist refresh path that currently depends on GitHub Pages deploys with a Cloudflare-managed data plane.

The production outcome should be:

- the static site shell can remain static
- user collection matching stays browser-local
- completionist hot data refreshes without rebuilding or redeploying the whole site
- the GitHub workflow-dispatch bridge is removed

## Why this change

The current model treats a hot data refresh like a site deploy:

- every `5` minutes, the repo republishes the site to update `site/data/live/`
- the Cloudflare worker only dispatches a GitHub workflow instead of owning the data pipeline
- snapshot freshness depends on GitHub Actions queueing, cache warmth, and Pages deploy latency
- the same concurrency lane is shared by shell deploys and live snapshot republishes
- failure handling is deploy-centric instead of data-pipeline-centric

This is the wrong control plane for a fast-refresh artifact.

## Constraints

- Keep collection uploads browser-local.
- Do not add a backend for user upload processing.
- Preserve the current manifest/snapshot schema in the first cut whenever possible.
- Keep a local/offline fixture path for preview and smoke checks.
- Do not require moving the main static shell off GitHub Pages in phase `1`.

## Non-goals

- Moving reference snapshots (`models`, `airports`, airport daily data) off the existing deploy flow in this change.
- Introducing accounts, shared user state, or server-side collection persistence.
- Rewriting the whole site hosting stack before the completionist data plane is stable.

## Target architecture

### Public read path

- Store published completionist artifacts in `R2`.
- Serve the public manifest through a Cloudflare-managed endpoint, ideally a custom `live.` or `api.` subdomain.
- Keep the stable manifest URL short-lived or `no-store`.
- Keep snapshots immutable and versioned so browsers can cache safely once the manifest points to them.
- Preserve the last good published manifest until a newer run finishes successfully.

### Refresh path

1. A `Cron Trigger` fires every `5` minutes.
2. A Worker starts one `Workflow` instance for the current schedule slot.
3. The workflow seeds the initial world tiles and enqueue messages to a `Queue`.
4. Queue consumers fetch tile payloads, normalize rows, and write per-tile artifacts to `R2`.
5. A per-run coordinator tracks request budget, split decisions, tile completion, and publish readiness.
6. Once the run is complete or budget-exhausted, the workflow finalizes the merged snapshot, writes versioned artifacts to `R2`, and flips the stable manifest to the new version.
7. The browser fetches the Cloudflare manifest instead of a site-deployed `site/data/live/` asset.

### Recommended coordinator

Use a per-run `Durable Object` coordinator.

Reasoning:

- `Queues` are at-least-once delivery, so the run needs strong dedupe and counters
- the workflow needs one consistent place to check run state
- publish should have a single lock and a single owner

Fallback:

- `D1` can store run state if the Durable Object shape becomes awkward
- `KV` should not be used as the run coordinator because this path needs stronger consistency

### Artifact contract

Keep the existing browser-facing contract as stable as possible:

- `fields`
- `rows`
- `rowCount`
- `generatedAt`
- `uiRefreshIntervalSeconds`
- `publishIntervalSeconds`
- `staleAfterSeconds`

The main publish change should be:

- the manifest is served from Cloudflare
- the manifest may point at an absolute or Worker-routed versioned snapshot URL instead of `./completionist-snapshot.json`

Unknown manifest keys can be added only if the browser safely ignores them.

### Safe publish sequence

Do not overwrite stable manifest and snapshot keys in-place without ordering.

Recommended sequence:

1. Write the versioned snapshot object for the run.
2. Write the versioned manifest for the run, pointing at that versioned snapshot.
3. Update the stable current-manifest object last.

This keeps the public read path atomic enough for the browser's current `manifest -> snapshot` fetch flow.

## Implementation phases

## Phase 0: Contract And Scaffolding

1. Add a decision record selecting `R2 + Cron Triggers + Workflows + Queues + Durable Objects` for completionist production refreshes.
2. Add a new Cloudflare completionist package under `workers/`.
3. Define:
   - the run ID format
   - queue message schema
   - R2 key layout
   - stable public manifest URL
   - environment variable and secret names
4. Update the frontend live-data loader so the completionist manifest URL is configurable and can point at Cloudflare while retaining the local `site/data/live/` fallback.
5. Add contract fixtures and parity tests so the new Worker implementation can be checked against the current Python output shape.

## Phase 1: Build The Cloudflare Pipeline In Shadow Mode

1. Port the sweep logic from [scripts/refresh_completionist_snapshot.py](/D:/Repositories/skyviz/scripts/refresh_completionist_snapshot.py) into Worker-friendly modules.
2. Implement:
   - scheduled trigger entry
   - workflow start/orchestration
   - queue producer
   - queue consumer
   - run coordinator
   - R2 publish path
3. Expose a health/status endpoint for manual inspection.
4. Keep the current GitHub-generated snapshot path as the production read path.
5. Run the Cloudflare pipeline in shadow mode and compare outputs for several days.

Shadow-mode comparison targets:

- row count band
- capped and split tile counts
- budget exhaustion frequency
- generated-at freshness
- filtering parity for rows without usable registrations
- final dedupe parity by `flightId`

## Phase 2: Frontend Cutover

1. Switch production completionist reads to the Cloudflare manifest URL.
2. Keep `site/data/live/` for local preview, offline validation, and fallback fixtures only.
3. Update browser error handling so it distinguishes:
   - live endpoint unavailable
   - live endpoint stale
   - live endpoint loaded successfully but no matches are present
4. Validate the GitHub Pages shell reading the Cloudflare live endpoint across desktop and mobile.
5. Keep one rollback switch so production can point back at the old site-hosted fixture path during burn-in.

## Phase 3: Remove GitHub Deploy Coupling

1. Remove completionist snapshot generation from [deploy-pages.yml](/D:/Repositories/skyviz/.github/workflows/deploy-pages.yml).
2. Delete [refresh-completionist-pages.yml](/D:/Repositories/skyviz/.github/workflows/refresh-completionist-pages.yml).
3. Delete [workers/completionist-dispatch](/D:/Repositories/skyviz/workers/completionist-dispatch).
4. Remove the GitHub token and `USE_EXTERNAL_COMPLETIONIST_SCHEDULER` setup from the steady-state workflow.
5. Update architecture, README, docs index, and repo-local skill references to describe Cloudflare as the completionist production path.

## Phase 4: Cleanup And Hardening

1. Decide whether the Python completionist refresh script remains as a local fixture generator or is renamed to make that role explicit.
2. Add retention rules for archived R2 runs.
3. Add run-level observability and stale-data alerts.
4. Decide later whether the main static shell should also move to Cloudflare hosting. That is explicitly out of scope for this migration.

## Cloudflare resources to provision

- `R2` bucket for completionist manifests, snapshots, and archived run artifacts
- `Queue` for tile fetch jobs
- `Workflow` binding for the orchestration run
- `Durable Object` namespace for the run coordinator
- Worker routes for:
  - cron entry
  - health/status
  - public live manifest and snapshot serving

Likely environment/config items:

- upstream feed URL
- initial tile degrees
- minimum tile degrees
- max request budget
- request delay
- stale threshold
- allowed browser origin(s)

## Repo changes by area

### Frontend

- [site/src/data.js](/D:/Repositories/skyviz/site/src/data.js)
  - configurable completionist manifest URL
  - local fallback behavior
  - remote-manifest/snapshot error handling
- [site/src/main.js](/D:/Repositories/skyviz/site/src/main.js)
  - messaging for unavailable vs stale live data

### Cloudflare runtime

- new `workers/` package for the completionist pipeline
- possible shared contract fixtures for local parity validation

### Validation

- [scripts/smoke_check.py](/D:/Repositories/skyviz/scripts/smoke_check.py)
  - keep local fixture validation intact
  - add awareness that production no longer depends on a site-deployed live snapshot
- [scripts/repo_hygiene_check.py](/D:/Repositories/skyviz/scripts/repo_hygiene_check.py)
  - update required workflow/runtime surfaces after cutover

### Docs

- [README.md](/D:/Repositories/skyviz/README.md)
- [docs/architecture.md](/D:/Repositories/skyviz/docs/architecture.md)
- [docs/index.md](/D:/Repositories/skyviz/docs/index.md)
- [skills/public/skyviz-feature-maintainer/SKILL.md](/D:/Repositories/skyviz/skills/public/skyviz-feature-maintainer/SKILL.md)

## Validation gates

### Pipeline correctness

- one schedule slot creates at most one publishable run
- a failed run never replaces the last good manifest
- queue redelivery does not create duplicate tile processing in the final snapshot
- versioned publish artifacts are internally consistent

### Freshness

- publish usually finishes within the `5` minute cadence
- if a run overruns, the next slot skips or defers cleanly instead of creating overlapping publishes
- the browser's stale indicator remains aligned with manifest timestamps

### Browser behavior

- completionist matching still happens only in-browser
- the map tab can fetch and refresh the remote manifest on GitHub Pages
- manual refresh and auto-refresh continue to work

### Rollback

- one configuration change can point production back to the old read path during burn-in
- the GitHub-based path is not removed until the Cloudflare path is verified

## Risks and mitigations

- Upstream feed behavior may differ from Cloudflare egress.
  - Mitigation: shadow mode, parity checks, and last-good publish retention.
- Queue delivery is at-least-once.
  - Mitigation: dedupe tile IDs in the coordinator and dedupe rows by `flightId` at finalize time.
- A `5` minute cadence may overlap during high split pressure.
  - Mitigation: schedule-slot run IDs, single active-run lock, explicit skip/defer logic.
- Cross-origin browser reads can fail on bad headers.
  - Mitigation: Worker-served CORS headers and pre-cutover browser validation.
- Local and production contracts can drift.
  - Mitigation: shared fixtures and schema assertions in smoke/parity tests.

## Open questions

- Start on a `workers.dev` URL for shadow mode only, or provision the production custom domain immediately?
- Should the stable public endpoint serve both manifest and snapshot through a Worker, or only serve the manifest while snapshots are fetched directly from versioned R2 public URLs?
- Does the Python refresh script stay permanently as a local-only tool, or should it be replaced later by a development command that hits the same JS implementation used in production?
