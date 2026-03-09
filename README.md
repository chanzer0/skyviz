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
python scripts/refresh_reference_data.py --manifest-only
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
5. During upload/example load, Skyviz reuses the private startup loading card so processing state is always visible while parsing and enrichment run.
6. Skyviz enriches the cards and airport unlocks with the committed reference snapshots.
7. The app switches into a dashboard-only tab shell (the landing hero and upload CTA are hidden).
8. Use the data-tools icon next to the `Map`/`Aircraft` toggle to upload a new export or clear current and saved local data.
9. Use the `Map` tab for captured vs missing airport plotting with airport completion shown directly on the map card plus a single right-side `Airport completion explorer` drill-down panel. The drill path is `Continents -> Countries -> US states` (US states appear when `United States` is selected). Continents and the `United States` row show explicit drill cues, and the panel includes helper copy plus `Back` + breadcrumb controls so it is always clear where you are in the hierarchy. Clicking a row focuses/highlights/zooms the map for that region and advances the drill level when a deeper level exists. The widget also includes explicit sort-category selection (`% complete`, `total airports`, `captured airports`, `name`), an adjacent ascending/descending arrow toggle (default `total airports` descending), and a `Details` expander per row with captured/remaining code lists plus per-scope `Copy` / `Export` actions. Airport dots scale up as you zoom in so map targets stay easier to click. Airport popups show `ICAO (IATA)` when available, the airport name, and direct links for both `View on FR24` and `View on Skydex`. At higher zoom levels, muted airport code labels render over dots with a cap to avoid excessive overlap.
10. On viewports larger than tablet, the map view uses a 50/50 split: a full-height map card on the left and a full-height drill-down completion card on the right with vertical scrolling for long lists.
11. Use the `Aircraft` tab in a split layout similar to `Map`: a large virtualized aircraft card deck on the left (or top on mobile) plus four interaction panels on the right (`Progress by type`, `Progress by category`, `Glows by tier`, `XP by tier`). Aircraft right-panel rows intentionally mirror the map explorer row UI/UX (same row structure, focus behavior, and details affordance) so interactions stay predictable across tabs. Clicking a row focuses/filters the deck by that slice, while `Details` only expands when the row's `Details` button is clicked. Expanded details include completed/missing model lists (`ICAO - name`) plus per-scope `Copy` / `Export` actions.
12. Aircraft cards render model imagery from tier-aware Skycards CDN paths (`.../models/images/1/{tier}/{ICAO}_md.png`; tier comes from the model's dominant card tier in your deck). If the direct model image is missing, Skyviz falls back through the `cyber` tier and then through reference metadata aliases (`imageOverride`, then `images[]`) before showing `Image unavailable`. Clicking anywhere else on a card opens an aircraft detail modal with collection KPIs plus latent reference metadata such as engine count/type, range, ceiling, length, height, landing gear, wing position/shape, military status, and season span. That modal now opens directly into the optimized GLB preview through `model-viewer` when a matching 3D asset exists, without exposing a 2D media toggle. Cards still show XP plus a second badge for unique registrations caught (`caught / total possible` when reference counts are available), an XP-tier badge (`paper`, `bronze`, `silver`, `gold`, `platinum`, `cyber`), a six-stat grid (`first flight`, `rarity`, `wingspan`, `speed`, `seats`, `weight in tonnes`), and inline icon metrics under the model name for `Framing %` and `Cloud %`. Missing stat values render as `N/A` instead of `0`, and deck card height/spacing scales by viewport to keep these rows legible on mobile and less cramped on larger screens, while mobile deck totals (`Total XP`, `Total glows`, `Total regs`) stay in one row when viewport width allows. The deck header includes filtered totals for XP, glow count, and caught registrations that update with search/focus filters. Clicking a model's regs badge opens a dedicated caught-registration modal for that ICAO model with the same registration-accuracy caution copy used in the transparency flow. The orange caution icon in the aircraft deck header opens the global registration-transparency modal, listing each unique registration row with mapped transponder hex, confidence/ambiguity class, mapping notes, and inline manual-mapping controls for non-high-confidence rows (no browser prompt popups). Manual, high, medium, ambiguous, and low confidence chips are clickable filter shortcuts in the modal. Manual mappings are saved in browser local storage only; the modal includes warning copy plus `Export manual mappings` / `Import mappings` actions so users can back up and restore overrides when local browser storage is cleared. Sorting uses an explicit sort-category dropdown plus adjacent ascending/descending arrow control, matching the map completion sort pattern and supporting aircraft stat dimensions (`first flight`, `speed`, `rarity`, `seats`, `wingspan`, `weight`) alongside deck metrics.
13. Dashboard cards use responsive layouts and collapse to single-column full-width flows on mobile viewports.
14. Local-storage restore notices appear as dismissible overlay toasts with a 10-second countdown.
15. A structured footer is always available with quick links, privacy reminders, and browser-local processing context.

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
After writing optional reference artifacts, rebuild `manifest.json` so the browser discovers them:

```bash
python scripts/refresh_reference_data.py --manifest-only
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
- `site/data/reference/manifest.json` (includes any optional local reference artifacts that exist when the refresh script runs)
- `site/data/reference/model_registration_counts.json`
- `site/data/reference/aircraft_lookup.json`
- `site/data/reference/inferred_aircraft_type_mappings.json` (optional local artifact for transparency review in the aircraft caution modal; appears in `manifest.json` when present)
- `site/data/reference/aircraft_lookup_resolved.json` (when generated locally)

## GitHub Pages

The repository includes a Pages deployment workflow that publishes the `site/` directory. The workflow expects the repository to be connected to GitHub and Pages to be configured for GitHub Actions deployment.

During Pages builds, the workflow refreshes:

- `models.json` / `airports.json`
- `model_registration_counts.json`
- `aircraft_lookup.json` only when `aircraft_data.db` is present in the build workspace
- `manifest.json` after optional reference artifacts are generated so deployed browsers can discover them

This repository ignores `site/data/reference/*` in git. CI and Pages workflows generate fresh reference snapshots before validation/deploy.
