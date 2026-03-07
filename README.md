# Skyviz

Skyviz is a static GitHub Pages dashboard for Skycards collection exports. A user uploads their `skycards_user.json` file in the browser, the app enriches it with Skycards `models` and `airports` reference snapshots, and the page renders a browser-only power dashboard with a Leaflet airport map tab plus an aircraft analytics tab.

## Product model

- No backend.
- No account system.
- No server-side upload handling.
- User collection data stays in the browser by default, with optional user-controlled local storage persistence on the same device.
- Reference enrichment comes from static snapshots in `site/data/reference/` generated from the Skycards API.

## Repository shape

- `site/`: static application deployed to GitHub Pages.
- `docs/`: system-of-record docs for architecture, workflow, and durable decisions.
- `scripts/`: low-risk maintenance and validation scripts.
- `skills/public/`: repo-local skills for future agent work.
- `skycards_user.json`: example Skycards export used for local development and validation.
- `cdn_index.json`: CDN route index for `https://cdn.skycards.oldapes.com/assets` (keys map to deeper URL segments/files; useful for diagnosing missing model images).
- `site/data/reference/`: generated reference snapshots (ignored in git by default and produced in CI/Pages build).

## Local preview

Because the app loads reference JSON with `fetch`, use an HTTP server instead of opening `index.html` directly.

If `site/data/reference/` does not exist yet in your local checkout, generate it first:

```bash
python scripts/refresh_reference_data.py
```

```bash
python -m http.server 4173 --directory site
```

Then open `http://localhost:4173`.

## Usage flow

1. A short private startup screen appears while Skyviz checks for saved local data on the current device.
2. If no saved data is restored, Skyviz shows a privacy-first landing view with the `Skyviz` title stack above the upload card and export instructions (linked to `github.com/mfkp/skycards-export`).
3. (Optional) Enable the local storage checkbox to keep the uploaded export on the current device.
4. Either upload your own Skycards export JSON file or use `View Example Dashboard` to load a built-in sample deck (20 airports + 20 popular models).
5. Skyviz enriches the cards and airport unlocks with the committed reference snapshots.
6. The app switches into a dashboard-only tab shell (the landing hero and upload CTA are hidden).
7. Use the data-tools icon next to the `Map`/`Aircraft` toggle to upload a new export or clear current and saved local data.
8. Use the `Map` tab for captured vs missing airport plotting with airport completion shown directly on the map card, plus searchable continent, country, and US-state completion widgets with explicit sort-category selection (`% complete`, `total airports`, `captured airports`, `name`) and an adjacent ascending/descending arrow toggle (default is `total airports` descending; country list includes all reference countries and US-state list includes all 50 states from US airports in reference data). Rows are clickable to zoom and highlight airports for that region, with a `Details` expander that reveals captured/remaining code lists and per-scope `Copy` / `Export` actions. Airport dots scale up as you zoom in so map targets stay easier to click. Airport popups show `ICAO (IATA)` when available and include a direct `View on FR24` airport link. At higher zoom levels, muted airport code labels render over dots with a cap to avoid excessive overlap.
9. On viewports larger than tablet, the map view uses a 50/50 split: a full-height map card on the left and three stacked completion cards on the right (continent, country, US states) with vertical scrolling for long completion lists. All three completion cards are collapsible; desktop defaults to continent collapsed, while mobile/tablet defaults to all expanded.
10. Use the `Aircraft` tab in a split layout similar to `Map`: a large virtualized aircraft card deck on the left (or top on mobile) plus four interaction panels on the right (`Progress by type`, `Progress by category`, `XP by category`, `XP by tier`). Clicking rows in those panels focuses/filters the deck.
11. Aircraft cards render model imagery from tier-aware Skycards CDN paths (`.../models/images/1/{tier}/{ICAO}_md.png`; tier comes from the model's dominant card tier in your deck). If the direct model image is missing, Skyviz falls back through the `cyber` tier and then through reference metadata aliases (`imageOverride`, then `images[]`) before showing `Image unavailable`. Cards show a six-stat grid (`first flight`, `rarity`, `wingspan`, `speed`, `seats`, `weight`) plus animated fluorescent glow borders/count badges when glows are present. Sorting uses an explicit sort-category dropdown plus adjacent ascending/descending arrow control, matching the map completion sort pattern.
12. Dashboard cards use responsive layouts and collapse to single-column full-width flows on mobile viewports.
13. Local-storage restore notices appear as dismissible overlay toasts with a 10-second countdown.
14. A structured footer is always available with quick links, privacy reminders, and browser-local processing context.

## Validation

```bash
python scripts/repo_hygiene_check.py
python scripts/smoke_check.py
```

## Refreshing Skycards reference data

The reference contract comes from the working implementation in `D:\Repositories\fr24-discord-bot`:

- Base URL: `https://api.skycards.oldapes.com`
- Endpoints: `/models` and `/airports`
- Required header: `x-client-version: 2.0.24`

Refresh the committed snapshots with:

```bash
python scripts/refresh_reference_data.py
```

Useful flags:

```bash
python scripts/refresh_reference_data.py --dataset models
python scripts/refresh_reference_data.py --client-version 2.0.24
python scripts/refresh_reference_data.py --out-dir site/data/reference
```

The script writes:

- `site/data/reference/models.json`
- `site/data/reference/airports.json`
- `site/data/reference/manifest.json`

## GitHub Pages

The repository includes a Pages deployment workflow that publishes the `site/` directory. The workflow expects the repository to be connected to GitHub and Pages to be configured for GitHub Actions deployment.

This repository ignores `site/data/reference/*` in git. CI and Pages workflows generate fresh reference snapshots before validation/deploy.
