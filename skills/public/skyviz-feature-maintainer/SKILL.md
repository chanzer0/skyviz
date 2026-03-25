---
name: skyviz-feature-maintainer
description: Implement or extend the Skyviz static dashboard, reference-data flow, GitHub Pages deployment, or the docs and scripts that must stay aligned with those changes.
---

# Skyviz Feature Maintainer

## Overview

Use this skill for normal product and maintenance work in this repository. It keeps the static site, reference snapshots, refresh tooling, and durable docs aligned in the same change.

## Workflow

1. Read `docs/index.md` and `docs/architecture.md`.
2. Review `docs/golden-principles.md` before making cross-cutting changes.
3. Read [references/code-map.md](references/code-map.md) to find the runtime surface you are changing.
4. Use [references/change-checklists.md](references/change-checklists.md) for follow-through after you know the change type.
5. Before any Cloudflare write operation, run `python scripts/check_cloudflare_account.py` and confirm Wrangler is on `seansailer28@gmail.com` / `172da47da00e3b33810d2e9c73c9a0b9`.
6. Make the smallest coherent change that keeps browser-local processing and GitHub Pages deployment intact unless the task explicitly changes those constraints.
7. Update docs, scripts, and workflow artifacts in the same pass when behavior changes.
8. For completionist source changes, keep `site/data/runtime-config.json` explicit about `activeSource` vs `shadowSource`, and prefer `python scripts/compare_completionist_sources.py` before flipping production reads.
9. Run the offline checks. For visual bug work, reproduce in Playwright before edits and confirm in Playwright after edits; for local real-data browser validation, refresh the repo-root fixture with `python scripts/export_skycards_user.py` if it is missing or stale, then start `python scripts/serve_local_preview.py` and use `?devLoad=skycards_user` or manual upload, never the built-in example deck; report when browser validation was not possible.

## Default rules

- Keep user collection data in-browser unless the task explicitly introduces a backend.
- Keep reference enrichment compatible with `scripts/refresh_reference_data.py`.
- Cloudflare writes must target `seansailer28@gmail.com` / `172da47da00e3b33810d2e9c73c9a0b9`.
- User-visible workflow changes update `README.md`.
- Architecture or durable workflow changes update `docs/`.
- Prefer adding repo-local guardrails over repeating the same chat explanation.

## Verification

- Default offline check: `python scripts/smoke_check.py`
- Optional completionist-fixture-only check: `python scripts/smoke_check.py --mode completionist-only`
- Repo workflow check: `python scripts/repo_hygiene_check.py`
- Private fixture refresh: `python scripts/export_skycards_user.py`
- Preview server for browser validation: `python scripts/serve_local_preview.py`
- Visual bug check: reproduce with Playwright before edits and confirm with Playwright after edits.
- For real-data browser validation, use the repo-root `skycards_user.json` fixture (`http://localhost:4173/?devLoad=skycards_user` or manual upload) and do not use the built-in example deck unless the task explicitly targets the sample flow.
- Use a browser pass when UI changes are meaningful and the environment supports it.

## References

- Read [references/code-map.md](references/code-map.md) first for file selection.
- Read [references/change-checklists.md](references/change-checklists.md) for follow-through rules.
