# Skyviz

Skyviz is a static GitHub Pages dashboard for Skycards collection exports plus two always-available browser-only daily aviation games: `Navdle` for airport clue-chasing and `Cardle` for Skycards model stat guessing. A user can upload their `skycards_user.json` file for the collection dashboard or jump straight into the daily games without an upload.

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
- `site/data/airports/`: generated OurAirports CSV snapshots plus the derived airport-daily manifest and game dataset.
- `site/data/reference/`: generated reference snapshots (ignored in git by default and produced in CI/Pages build).
- `site/tools/aircraft-db-explorer.html`: local-only SQLite explorer for inspecting `aircraft_data.db` in-browser.
- `site/tools/inferred-mapping-reviewer.html`: local-only reviewer for medium/ambiguous inferred type mappings.

## Local preview

Because the app loads reference JSON with `fetch`, use an HTTP server instead of opening `index.html` directly.

If generated data directories do not exist yet in your local checkout, generate them first:

```bash
python scripts/refresh_reference_data.py
python scripts/refresh_model_registration_counts.py
python scripts/build_aircraft_lookup_from_db.py --db-path aircraft_data.db
python scripts/refresh_reference_data.py --manifest-only
python scripts/refresh_airport_game_data.py
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
2. If no saved data is restored, Skyviz shows a privacy-first landing view with the `Skyviz` title stack, a short vertically stacked two-game daily CTA hub for `Navdle` and `Cardle`, the upload card, and export instructions (linked to `github.com/mfkp/skycards-export`).
3. Both landing daily-game cards open without requiring a Skycards upload. Daily guesses, unlocks, streaks, and share-state stay in browser local storage only on the current device.
4. (Optional) Enable the local storage checkbox to keep the uploaded export on the current device.
5. Either upload your own Skycards export JSON file or use `View Example Dashboard` to load a built-in sample deck (20 airports + 20 popular models).
6. During upload/example load, Skyviz reuses the private startup loading card so processing state is always visible while parsing and enrichment run.
7. Skyviz enriches the cards and airport unlocks with the committed reference snapshots.
8. The app switches into a tabbed dashboard shell. `Navdle` and `Cardle` are always available; `Map` and `Deck` unlock after an upload or example deck load.
9. Use the data-tools icon next to the tab toggle to manage the active dashboard: upload a new export, turn browser-local save on or off for the current upload, or clear current and saved local data.
10. Use the `Navdle` tab for the airport mini-game: the hero centers a larger airport search bar, gives the `Navdle` title stronger typographic priority, keeps a compact top-right grid for reset/streak/win-rate chips, and uses a tighter guesses-left plus hint row so more vertical room stays available for the guess board. The landing-page Navdle teaser keeps only `Streak` and `Reset` chips so the home-page CTA stays lighter. Visible guess submission is driven directly from search suggestions or the keyboard Enter key on exact matches, so the old oversized submit button is gone and the hero input is more compact. The guess meter distinguishes solid used markers from the outlined current slot so the next attempt reads clearly. A static `Best so far` tracker row stays above the guess trail while the board is unsolved and keeps the strongest clue the player has seen in each category, preserving exact matches in green while carrying forward the closest logged value elsewhere. Guesses stack in a connected top-down timeline, and the between-guess chips call out explicit per-category changes like distance, direction, elevation, runway count, navaids, and location matches instead of aggregate summaries. Those transition chips omit categories that are already exact on the newer guess so the rail only highlights unresolved clues. On phone-sized viewports, the guess history compresses into denser two-column clue cards with swipeable transition rails so more of the board stays visible without losing clue detail. Autocomplete suggestions prioritize larger and scheduled-service airports for broad text searches, and every clue tile includes a `?` explainer for what that category means. The weekly UTC theme cadence now rotates only `Wildcard`, `Hub`, and `Regional` days (`Wildcard` on Sunday and Saturday, `Hub` on Monday and Tuesday, `Regional` on Wednesday through Friday), and the small-airport pool only keeps airports with an IATA code plus at least three published frequency entries so obviously niche fields stop dominating the draw while recognizable municipals still stay eligible. Those explainers now shift and flip within the active viewport instead of overflowing off-screen on tighter layouts or lower rows. Search matching now folds accents as well, so plain-text queries like `cancun` still find `Cancun`. Each clue box uses a muted category label with the actual value as the main visual focus, and only the distance clue keeps the extra compass meta line so the rest of the grid reads more cleanly. The hint system auto-reveals progressively after guesses `3`, `5`, `7`, and the final guess, surfacing one clue at a time from the airport's queued open-data hints. Recent community notes are used first when available, then fallback derived clues fill any remaining slots. Community-note hints still redact direct airport identifiers until the answer is revealed, and the solved/revealed answer card recaps the full hint stack with the caution copy intact. The streak and win-rate area includes an explicit privacy note that those stats stay in browser local storage on the current device only. Solving the board triggers a one-shot celebration burst in the daily shell, pulses the streak and win-rate chips when they change, and keeps `Copy results` next to the revealed answer so the share-ready Wordle-style clipboard export stays available on both direct hits and revealed losses: a single header line plus one emoji row per guess, with an optional hint marker when a hint was used, followed by a direct link back to the daily game at `#navdle`. The daily game credits [OurAirports open data](https://ourairports.com/data/) directly in muted in-UI attribution text.
    On mobile, the `Reset`, `Streak`, and `Win rate` chips stay compressed into a single row so they do not steal vertical room from the guesses.
    Community-note hints keep airport names visually concealed with a styled redaction treatment instead of a raw `[redacted]` token, and the full note is still restored once the answer is revealed.
11. Use the `Cardle` tab for the aircraft-model mini-game: the command deck mirrors Navdle so the two games feel related, and it now uses the same tighter guesses-left progress strip directly under search. The player gets `8` total guesses, enters ICAO/manufacturer/model search terms, and each submitted row recolors eight stat cells (`first flight`, `rarity`, `wingspan`, `speed`, `range`, `ceiling`, `seats`, `weight`) into gray/yellow/green higher-lower-exact feedback just like Navdle's comparison language. Previous guesses still prioritize a larger aircraft image and slimmer stat tiles so the thumbnail stays visible instead of getting buried by the comparison grid. The live comparison card now behaves like Navdle's pinned `Best so far` tracker: it starts with `--` / `?` placeholders, keeps the closest logged clue in each tracked category, holds manufacturer and model name behind redaction boxes instead of mirroring the latest guess, swaps `Height` out for catchable-registration counts, and only locks the manufacturer open in green after an exact match. The registration-origin hotspot map and 3D model reveal stay in the same shell, with the map now leading on the left, both surfaces redacted at first, and the old stage headers/notes collapsed into on-surface overlay chips so the render area stays dominant. The hotspot map unlocks after guess `3`, the 3D reveal unlocks after guess `5`, and once the map is live the browser fetches live multipoint data from `https://api.skycards.oldapes.com/models/multipoint/{icao}` and plots those returned coordinates into an interactive Leaflet world map that reuses the same base-map runtime as the main `Map` tab. Solving now reuses Navdle-style celebration and reveal treatment, including the same share-action styling, while solved and lost states reveal the full target profile, the hotspot count, and a share-ready results grid linked back to `#cardle`. Cardle now initializes from the lighter models-plus-registration-count reference path instead of the full dashboard reference bundle, and both direct `#navdle` / `#cardle` loads and first-open daily-tab transitions keep the boot screen visible until the requested daily shell is interactive instead of exposing a blocked dashboard.
12. Use the `Map` tab for captured vs missing airport plotting with airport completion shown directly on the map card plus a single right-side `Airport completion explorer` drill-down panel. The drill path is `Continents -> Countries -> US states` (US states appear when `United States` is selected). Continents and the `United States` row show explicit drill cues, and the panel includes helper copy plus `Back` + breadcrumb controls so it is always clear where you are in the hierarchy. Clicking a row focuses/highlights/zooms the map for that region and advances the drill level when a deeper level exists. The widget also includes explicit sort-category selection (`% complete`, `total airports`, `captured airports`, `name`), an adjacent ascending/descending arrow toggle (default `total airports` descending), and a `Details` expander per row with captured/remaining code lists plus per-scope `Copy` / `Export` actions. Airport dots scale up as you zoom in so map targets stay easier to click. Airport popups show `ICAO (IATA)` when available, the airport name, and direct links for both `View on FR24` and `View on Skydex`. At higher zoom levels, muted airport code labels render over dots with a cap to avoid excessive overlap.
13. On viewports larger than tablet, the map view uses a 50/50 split: a full-height map card on the left and a full-height drill-down completion card on the right with vertical scrolling for long lists.
14. Use the `Deck` tab in a split layout similar to `Map`: a large virtualized aircraft card deck on the left (or top on mobile) plus four interaction panels on the right (`Progress by type`, `Progress by category`, `Glows by tier`, `XP by tier`). Aircraft right-panel rows intentionally mirror the map explorer row UI/UX (same row structure, focus behavior, and details affordance) so interactions stay predictable across tabs. Clicking a row focuses/filters the deck by that slice, while `Details` only expands when the row's `Details` button is clicked. Expanded details include completed/missing model lists (`ICAO - name`) plus per-scope `Copy` / `Export` actions.
15. Aircraft cards render model imagery from tier-aware Skycards CDN paths (`.../models/images/1/{tier}/{ICAO}_md.png`; tier comes from the model's dominant card tier in your deck). If the direct model image is missing, Skyviz falls back through the `cyber` tier and then through reference metadata aliases (`imageOverride`, then `images[]`) before showing `Image unavailable`. Clicking anywhere else on a card opens an aircraft detail modal with collection KPIs plus latent reference metadata such as engine count/type, range, ceiling, length, height, landing gear, wing position/shape, military status, and season span. That modal now opens directly into the optimized GLB preview through `model-viewer` when a matching 3D asset exists, without exposing a 2D media toggle. Cards still show XP plus a second badge for unique registrations caught (`caught / total possible` when reference counts are available), an XP-tier badge (`paper`, `bronze`, `silver`, `gold`, `platinum`, `cyber`), a six-stat grid (`first flight`, `rarity`, `wingspan`, `speed`, `seats`, `weight in tonnes`), and inline icon metrics under the model name for `Framing %` and `Cloud %`. Missing stat values render as `N/A` instead of `0`, and deck card height/spacing scales by viewport to keep these rows legible on mobile and less cramped on larger screens, while mobile deck totals (`Total XP`, `Total glows`, `Total regs`) stay in one row when viewport width allows. The deck header includes filtered totals for XP, glow count, and caught registrations that update with search/focus filters. Clicking a model's regs badge opens a dedicated caught-registration modal for that ICAO model with the same registration-accuracy caution copy used in the transparency flow. The orange caution icon in the aircraft deck header opens the global registration-transparency modal, listing each unique registration row with mapped transponder hex, confidence/ambiguity class, mapping notes, and inline manual-mapping controls for non-high-confidence rows (no browser prompt popups). Manual, high, medium, ambiguous, and low confidence chips are clickable filter shortcuts in the modal. Manual mappings are saved in browser local storage only; the modal includes warning copy plus `Export manual mappings` / `Import mappings` actions so users can back up and restore overrides when local browser storage is cleared. Sorting uses an explicit sort-category dropdown plus adjacent ascending/descending arrow control, matching the map completion sort pattern and supporting aircraft stat dimensions (`first flight`, `speed`, `rarity`, `seats`, `wingspan`, `weight`) alongside deck metrics.
16. Dashboard cards use responsive layouts and collapse to single-column full-width flows on mobile viewports.
17. Local-storage restore notices appear as dismissible overlay toasts with a 10-second countdown.
18. A structured footer is always available with quick links, privacy reminders, browser-local processing context, the OurAirports daily-game attribution link, and the Cardle hotspot-hint disclosure that live model-origin coordinates are fetched only after the reveal unlocks.

## Validation

```bash
python scripts/repo_hygiene_check.py
python scripts/smoke_check.py
```

## Refreshing Skycards reference data

The reference contract comes from the working implementation in `D:\Repositories\fr24-discord-bot`:

- Base URL: `https://api.skycards.oldapes.com`
- Endpoints: `/models`, `/airports`, `/models/count/{icao}`, and the Cardle hotspot hint endpoint `/models/multipoint/{icao}`
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

## Refreshing Navdle airport daily data

The `Navdle` airport game uses [OurAirports open data](https://ourairports.com/data/), refreshed from the official mirror at `https://davidmegginson.github.io/ourairports-data/`. `Cardle` does not require a separate generated daily dataset; it derives its board from `site/data/reference/models.json` at runtime and optionally fetches live hotspot coordinates after the map reveal unlocks.

Refresh the airport CSV snapshots and rebuild the derived browser dataset with:

```bash
python scripts/refresh_airport_game_data.py
```

Useful flags:

```bash
python scripts/refresh_airport_game_data.py --build-only
python scripts/refresh_airport_game_data.py --download-only
python scripts/refresh_airport_game_data.py --csv-dir site/data/airports
```

The script writes:

- `site/data/airports/airports.csv`
- `site/data/airports/runways.csv`
- `site/data/airports/navaids.csv`
- `site/data/airports/airport-frequencies.csv`
- `site/data/airports/airport-comments.csv`
- `site/data/airports/countries.csv`
- `site/data/airports/regions.csv`
- `site/data/airports/daily-game.json`
- `site/data/airports/manifest.json`

## GitHub Pages

The repository includes a Pages deployment workflow that publishes the `site/` directory. The workflow expects the repository to be connected to GitHub and Pages to be configured for GitHub Actions deployment.

During Pages builds, the workflow refreshes:

- `models.json` / `airports.json`
- `model_registration_counts.json`
- `aircraft_lookup.json` only when `aircraft_data.db` is present in the build workspace
- `manifest.json` after optional reference artifacts are generated so deployed browsers can discover them
- the OurAirports CSV snapshots plus `site/data/airports/daily-game.json` / `site/data/airports/manifest.json` for `Navdle`

This repository ignores generated files under `site/data/reference/*` and `site/data/airports/*.csv` / `site/data/airports/daily-game.json` / `site/data/airports/manifest.json` in git. CI and Pages workflows generate fresh snapshots before validation/deploy. Cardle continues to run from the committed reference snapshots; its hotspot hint depends on live browser access to the Skycards multipoint endpoint at play time.
