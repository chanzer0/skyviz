# 2026-03-06 Initial Skyviz Foundation

## Goal

Stand up the first usable version of Skyviz as a static, agent-friendly repository that can:

- accept a Skycards user export in the browser
- enrich aircraft and airport data from committed Skycards reference snapshots
- render a polished first-pass dashboard suitable for GitHub Pages
- carry its own maintenance docs, skills, and refresh workflow

## Delivered

- Repo operating model grounded in `AGENTS.md`, `docs/`, repo-local skills, and lightweight validation scripts.
- Static GitHub Pages app in `site/` with drag-and-drop JSON upload, browser-local processing, and committed reference snapshots.
- First-pass visualizations for tier mix, card categories, manufacturers, first-flight eras, speed vs seats, airport footprint, place-code spread, engine mix, collection XP leaders, and data quality.
- Reference refresh tooling in `scripts/refresh_reference_data.py` using the Skycards API contract from `D:\Repositories\fr24-discord-bot`.
- Seeded `models.json`, `airports.json`, and `manifest.json` under `site/data/reference/`.
- CI and Pages deployment workflows in `.github/workflows/`.

## Validation

- `python scripts/repo_hygiene_check.py`
- `python scripts/smoke_check.py`
- `node --check site/src/format.js`
- `node --check site/src/charts.js`
- `node --check site/src/data.js`
- `node --check site/src/main.js`
- Sample-data model build against `skycards_user.json` and the committed reference snapshots
- Local HTTP preview check via `python -m http.server 4173 --directory site` plus `Invoke-WebRequest` status `200`

## Current gap

A real browser pass was not completed in this sandbox. The expected Playwright path is blocked here because `npx` crashes before execution with `EPERM: operation not permitted, lstat 'C:\Users\seans'`.
