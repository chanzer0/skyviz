# Repository Agent Guide

This file routes context. Durable knowledge lives in `docs/`.

## Start Here

- Read `docs/index.md` first for the system-of-record map.
- Read `README.md` for local preview, reference refresh, and Pages deployment.
- Read `docs/architecture.md` before non-trivial UI, data, or workflow changes.
- Use the repo-local skill in `skills/public/skyviz-feature-maintainer/` when feature work touches the site, reference data, or docs.

## System Of Record

- `docs/index.md`: documentation table of contents and update map.
- `docs/agentic-workflows.md`: how agents should work in this repository.
- `docs/golden-principles.md`: runtime and follow-through invariants.
- `docs/repo-hygiene.md`: entropy control and cleanup rules.
- `docs/decisions/`: durable design history.
- `docs/plans/`: active and completed execution plans.

## Core Surfaces

- `site/index.html`: GitHub Pages entry point and application shell.
- `site/styles.css`: visual system, layout, and motion.
- `site/src/main.js`: boot flow, uploads, state transitions, and rendering orchestration.
- `site/src/data.js`: validation, enrichment, and dashboard view-model creation.
- `site/src/charts.js`: SVG and HTML visualization helpers.
- `site/data/runtime-config.json`: production completionist source selection (`activeSource` / `shadowSource`) and manifest endpoints.
- `scripts/refresh_reference_data.py`: fetches `models` and `airports` from the Skycards API.
- `scripts/check_cloudflare_account.py`: verifies Wrangler auth and the locked Cloudflare account before write operations.
- `.github/workflows/deploy-pages.yml`: full GitHub Pages deploy for the static shell and generated reference artifacts.
- `workers/completionist-live/`: legacy Skyviz-owned completionist producer kept for shadow-mode parity during the fr24 shared-data cutover.
- `site/data/reference/`: committed Skycards reference snapshots used by the static app.

## Non-Negotiable Rules

- Keep collection processing browser-local. Do not add a backend unless the task explicitly changes the product model.
- Enrich cards and airports from the official Skycards `models` and `airports` payloads, not ad hoc copies.
- Any Cloudflare operation in this repo must target `seansailer28@gmail.com` / account id `172da47da00e3b33810d2e9c73c9a0b9`.
- Keep `AGENTS.md` short. Move durable detail into `docs/`, `skills/`, or scripts.
- Treat repo-root JSON files as data artifacts, not the source of truth for workflow guidance.

## Required Follow-Through

- User-visible dashboard changes update site code and `README.md` when behavior or usage changes.
- Reference contract changes update `scripts/refresh_reference_data.py`, `site/src/data.js`, and the related docs.
- Workflow or architecture changes update `docs/index.md`, the relevant doc surfaces, and the repo-local skill when needed.

## Verification

- `python scripts/smoke_check.py`
- `python scripts/repo_hygiene_check.py`
- Preview locally with `python scripts/serve_local_preview.py`
- For local real-data browser validation, use the repo-root `skycards_user.json` fixture (manual upload or `http://localhost:4173/?devLoad=skycards_user`); do not use the in-app example deck.
- Use a browser pass for meaningful UI changes when the environment supports it.
- For visual bug fixes, reproduce the issue with Playwright before edits and confirm the fix with Playwright after edits; if Playwright cannot run, say so explicitly.

## Response Expectations

- Call out user-visible behavior changes, reference-data changes, and GitHub Pages impact.
- Say explicitly when live Skycards fetches or browser behavior could not be validated.
