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
- `site/tools/aircraft-db-explorer.html`: local-only SQLite explorer for inspecting `aircraft_data.db` in-browser.
- `site/tools/inferred-mapping-reviewer.html`: local-only reviewer for medium/ambiguous inferred type mappings.

## Local preview

Because the app loads reference JSON with `fetch`, use an HTTP server instead of opening `index.html` directly.

If `site/data/reference/` does not exist yet in your local checkout, generate it first:

```bash
python scripts/refresh_reference_data.py
python scripts/refresh_model_registration_counts.py
python scripts/build_aircraft_lookup_from_db.py --db-path aircraft_data.db
```

```bash
python -m http.server 4173 --directory site
```

Then open `http://localhost:4173`.

## Local DB explorer

For private local SQLite exploration (no backend, no upload to remote services), serve `site/` and open:

- `http://localhost:4173/tools/aircraft-db-explorer.html`

Then load `aircraft_data.db` from your machine using the file picker.

## Local inferred-mapping reviewer

To review medium/ambiguous inferred rows locally:

- `http://localhost:4173/tools/inferred-mapping-reviewer.html`

Load `output/inferred_aircraft_type_mappings.json`, review rows, and export decision JSON.

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
10. Use the `Aircraft` tab in a split layout similar to `Map`: a large virtualized aircraft card deck on the left (or top on mobile) plus four interaction panels on the right (`Progress by type`, `Progress by category`, `XP by category`, `XP by tier`). Clicking rows in those panels focuses/filters the deck, and each row includes a `Details` expander with completed/missing model lists (`ICAO - name`) plus per-scope `Copy` / `Export` actions.
11. Aircraft cards render model imagery from tier-aware Skycards CDN paths (`.../models/images/1/{tier}/{ICAO}_md.png`; tier comes from the model's dominant card tier in your deck). If the direct model image is missing, Skyviz falls back through the `cyber` tier and then through reference metadata aliases (`imageOverride`, then `images[]`) before showing `Image unavailable`. Cards show XP plus a second badge for unique registrations caught (`caught / total possible` when reference counts are available), a six-stat grid (`first flight`, `rarity`, `wingspan`, `speed`, `seats`, `weight`), and animated fluorescent glow borders/count badges when glows are present. Clicking a model’s regs badge opens a dedicated caught-registration modal for that ICAO model with the same registration-accuracy caution copy used in the transparency flow. The orange caution icon in the aircraft deck header opens the global registration-transparency modal, listing each unique registration row with mapped transponder hex, confidence/ambiguity class, and mapping notes. Sorting uses an explicit sort-category dropdown plus adjacent ascending/descending arrow control, matching the map completion sort pattern.
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
- Endpoints: `/models`, `/airports`, and `/models/count/{icao}`
- Required header: `x-client-version: 2.0.24`

Refresh the core snapshots with:

```bash
python scripts/refresh_reference_data.py
python scripts/refresh_model_registration_counts.py
```
Build the `aircraftId` lookup used for per-model caught registration mapping from the local SQLite snapshot:

```bash
python scripts/build_aircraft_lookup_from_db.py --db-path aircraft_data.db
```
Generate an inference/review artifact for unresolved `aircraftId`/registration rows:

```bash
python scripts/build_inferred_aircraft_mappings.py --export-path skycards_user.json --db-path aircraft_data.db
```
Merge high-confidence inferred rows into a consumable resolved lookup:

```bash
python scripts/build_resolved_aircraft_lookup.py --base-lookup-path site/data/reference/aircraft_lookup.json --inferred-path output/inferred_aircraft_type_mappings.json --out-path site/data/reference/aircraft_lookup_resolved.json
```

Useful flags:

```bash
python scripts/refresh_reference_data.py --dataset models
python scripts/refresh_reference_data.py --client-version 2.0.24
python scripts/refresh_reference_data.py --out-dir site/data/reference
python scripts/refresh_model_registration_counts.py --workers 16
python scripts/build_aircraft_lookup_from_db.py --include-registration-map
python scripts/build_inferred_aircraft_mappings.py --out-json output/inferred_aircraft_type_mappings.json --out-review output/inferred_aircraft_type_mappings_review.md
python scripts/build_inferred_aircraft_mappings.py --out-json site/data/reference/inferred_aircraft_type_mappings.json --out-review output/inferred_aircraft_type_mappings_review.md
python scripts/build_resolved_aircraft_lookup.py --include-medium
```

The scripts write:

- `site/data/reference/models.json`
- `site/data/reference/airports.json`
- `site/data/reference/manifest.json`
- `site/data/reference/model_registration_counts.json`
- `site/data/reference/aircraft_lookup.json`
- `site/data/reference/inferred_aircraft_type_mappings.json` (optional local artifact for transparency review in the aircraft caution modal)
- `site/data/reference/aircraft_lookup_resolved.json` (when generated locally)

## GitHub Pages

The repository includes a Pages deployment workflow that publishes the `site/` directory. The workflow expects the repository to be connected to GitHub and Pages to be configured for GitHub Actions deployment.

During Pages builds, the workflow refreshes:

- `models.json` / `airports.json` / `manifest.json`
- `model_registration_counts.json`
- `aircraft_lookup.json` only when `aircraft_data.db` is present in the build workspace

This repository ignores `site/data/reference/*` in git. CI and Pages workflows generate fresh reference snapshots before validation/deploy.
