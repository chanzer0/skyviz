# 2026-03-23 fr24 Shared Completionist Cutover

## Goal

Move Skyviz from its legacy Skyviz-owned completionist Cloudflare worker to the fr24-derived shared completionist manifest without changing the browser-local product model.

## Current status

Shadow-mode consumer support is implemented. Production still reads the legacy Skyviz source by default.

## Completed in this phase

- Added `activeSource` / `shadowSource` support to `site/data/runtime-config.json`.
- Updated `site/src/data.js` so the browser can resolve completionist sources from runtime-config and explicit query overrides.
- Preserved the localhost/local-fixture default under `site/data/live/`.
- Added `scripts/compare_completionist_sources.py` for active-vs-shadow parity checks.
- Updated durable docs and worker notes so `workers/completionist-live/` is clearly treated as the legacy shadow producer during the cutover.

## Remaining rollout steps

- Run parity checks against the deployed fr24-derived manifest until overlap, freshness, and target parity are acceptable.
- Flip `activeSource` from `skyvizLegacy` to `fr24Shared` after approval.
- Burn in the fr24-derived source in production.
- Retire `workers/completionist-live/` after cutover and update docs again when that deletion is approved.

## Validation for this checkpoint

- `python scripts/compare_completionist_sources.py --help`
- `python -m py_compile scripts/compare_completionist_sources.py`
- `python scripts/smoke_check.py --mode completionist-only`
- `python scripts/repo_hygiene_check.py`

## Notes

- The browser still fetches only one completionist manifest at a time.
- Shadow mode is an operational/runtime-config concern, not a dual-fetch UI feature.
- If the fr24-derived manifest is unavailable, production remains on the legacy source until a deliberate config flip is approved.
