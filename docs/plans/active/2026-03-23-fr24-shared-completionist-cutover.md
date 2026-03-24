# 2026-03-23 fr24 Shared Completionist Cutover

## Goal

Move Skyviz from its legacy Skyviz-owned completionist Cloudflare worker to the fr24-derived shared completionist manifest without changing the browser-local product model.

This plan now depends on the producer-side dual-source architecture tracked in:

- `D:/Repositories/fr24-discord-bot-cloudflare/docs/plans/active/2026-03-24-dual-source-live-flight-unification.md`

## Current status

Producer-side dual-source unification is now live from `fr24-discord-bot`, and the consumer cutover is approved in this branch. `site/data/runtime-config.json` now flips production reads to `fr24Shared` while keeping `skyvizLegacy` as the shadow rollback source during burn-in.

The deciding evidence is no longer raw feed-row parity by itself. The more important gate is user-visible completionist parity for a real Skycards fixture, and the latest `2026-03-24` check against the repo-root `skycards_user.json` fixture is close enough to cut over safely.

## Completed in this phase

- Added `activeSource` / `shadowSource` support to `site/data/runtime-config.json`.
- Updated `site/src/data.js` so the browser can resolve completionist sources from runtime-config and explicit query overrides.
- Preserved the localhost/local-fixture default under `site/data/live/`.
- Added `scripts/compare_completionist_sources.py` for active-vs-shadow parity checks.
- Updated durable docs and worker notes so `workers/completionist-live/` is clearly treated as the legacy shadow producer during the cutover.
- Flipped `runtime-config.json` to `activeSource=fr24Shared` / `shadowSource=skyvizLegacy` for the production cutover branch.
- Re-based the cutover decision on the unified producer artifact from `fr24-discord-bot` instead of the earlier ADS-B-only producer output.

## Remaining rollout steps

- Merge and deploy the consumer branch with `activeSource=fr24Shared` / `shadowSource=skyvizLegacy`.
- Run burn-in parity checks against the live shared manifest and keep the legacy worker available as rollback while confidence builds.
- Watch for material user-visible regressions in missing-airport / new-card targets rather than chasing raw feed-row equality.
- Retire `workers/completionist-live/` only after burn-in is stable and the removal is explicitly approved.

## Validation for this checkpoint

- `python scripts/compare_completionist_sources.py --help`
- `python -m py_compile scripts/compare_completionist_sources.py`
- `python scripts/smoke_check.py --mode completionist-only`
- `python scripts/repo_hygiene_check.py`

## Notes

- The browser still fetches only one completionist manifest at a time.
- Shadow mode is an operational/runtime-config concern, not a dual-fetch UI feature.
- If the fr24-shared manifest regresses during burn-in, rollback is a runtime-config change back to `skyvizLegacy`.
- Raw parity remains looser than display parity, which is expected:
  - latest raw feed snapshot on `2026-03-24`: `16772` legacy rows vs `15803` fr24-shared rows
  - overlap: `14453` shared flight IDs
  - legacy-only rows: `2319`
  - fr24-shared-only rows: `1350`
- The deciding cutover check is displayable-target parity for a real collection, not raw feed-row equality:
  - latest fixture check on `2026-03-24`: `705` legacy displayable targets vs `712` fr24-shared displayable targets
  - overlap: `701`
  - legacy-only displayable targets: `4`
  - fr24-shared-only displayable targets: `11`
- The remaining legacy-only displayable rows were narrow edge cases rather than a broad coverage gap, while the fr24-shared-only rows were legitimate missing-airport or new-card targets.
