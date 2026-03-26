# Skyviz

Skyviz is a static GitHub Pages dashboard for Skycards collection exports plus two always-available browser-only daily aviation games: `Navdle` for airport clue-chasing and `Cardle` for Skycards model stat guessing. It now also includes a standalone `/daily-missions/` live mission board that reads the shared fr24 daily-missions artifact with no upload required. A user can upload their `skycards_user.json` file for the collection dashboard or jump straight into the daily games or mission board without an upload.

## Product model

- No backend.
- No account system.
- No server-side upload handling.
- User collection data stays in the browser by default, with optional user-controlled browser-storage persistence on the same device.
- Reference enrichment comes from static snapshots in `site/data/reference/` generated from the Skycards API.
- Completionist mode uses a shared delayed flight snapshot served from Cloudflare in production, with `site/data/runtime-config.json` selecting the active and shadow sources, `site/data/live/` kept as the local fixture path, and matching against a user's collection still happening only in that user's browser.
- Daily missions uses a separate standalone page at `site/daily-missions/`, opens in `All missions` mode by default, and reads the canonical `derived/daily-missions` manifest published by `fr24-discord-bot`, with query-string support for `?date=YYYY-MM-DD`, `?mission=<mission-key>`, and `?dailyMissionsManifestUrl=<absolute-url>`.

## Repository shape

- `site/`: static application deployed to GitHub Pages.
- `docs/`: system-of-record docs for architecture, workflow, and durable decisions.
- `scripts/`: low-risk maintenance and validation scripts.
- `skills/public/`: repo-local skills for future agent work.
- `skycards_user.json`: repo-root real Skycards export fixture used for local development and real-data validation.
- `cdn_index.json`: CDN route index for `https://cdn.skycards.oldapes.com/assets` (keys map to deeper URL segments/files; useful for diagnosing missing model images).
- `site/data/airports/`: generated OurAirports CSV snapshots plus the derived airport-daily manifest and game dataset.
- `site/data/reference/`: generated reference snapshots (ignored in git by default and produced in CI/Pages build).
- `site/data/runtime-config.json`: production completionist source selection plus active/shadow manifest endpoints used by the browser.
- `site/daily-missions/`: standalone mission-board route with its own HTML shell and page-specific styles.
- `site/src/daily-missions-main.js`: dedicated browser runtime for the standalone daily-missions board.
- `site/data/live/`: local completionist fixture artifacts for preview and offline validation.
- `scripts/serve_local_preview.py`: repo-aware local preview server that serves `site/` plus the repo-root `skycards_user.json` fixture.
- `scripts/export_skycards_user.py`: local-only TUI/CLI that refreshes the repo-root `skycards_user.json` fixture from the live Skycards login endpoint using a gitignored env file.
- `workers/completionist-live/`: legacy Skyviz-owned Cloudflare completionist producer kept for shadow-mode parity during the fr24 shared-data cutover.
- `scripts/check_cloudflare_account.py`: Cloudflare account-lock preflight for Wrangler write operations.
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
python scripts/refresh_completionist_snapshot.py
```

The completionist refresh script now does an adaptive global bounds sweep against the upstream live-flight feed rather than a single global request, so a full local run may take longer than the other refresh commands.

Local preview automatically prefers the generated `site/data/live/` fixture path even when production is configured to read a Cloudflare endpoint from `site/data/runtime-config.json`.

```bash
python scripts/serve_local_preview.py
```

Then open `http://localhost:4173`.

For real-data browser validation, open `http://localhost:4173/?devLoad=skycards_user` or upload the repo-root `skycards_user.json` once the preview is running. The localhost-only `devLoad` flow fetches that repo-root fixture directly into the browser, which keeps Playwright and manual testing on the same real collection data. Do not use `View Example Dashboard` when validating real collection or completionist behavior; keep it only for the lightweight sample-deck flow.

If that repo-root fixture is missing or stale, refresh it locally first:

```bash
cp .env.skycards.local.example .env.skycards.local
python scripts/export_skycards_user.py
```

Set `SKYCARDS_EMAIL` and `SKYCARDS_PASSWORD` in `.env.skycards.local`. The exporter stays local-only: it reads that gitignored env file, writes the full `response.userData` object to the ignored repo-root `skycards_user.json` fixture, and also stores timestamped archive copies under `output/skycards-user-exports/`.

For completionist shadow-mode validation, the browser also accepts:

- `?completionistSource=active` to force the runtime-config active Cloudflare source
- `?completionistSource=shadow` to force the runtime-config shadow Cloudflare source
- `?completionistManifestUrl=<absolute-url>` to force one explicit manifest URL

For the standalone daily-missions page, the browser also accepts:

- `/daily-missions/?date=<YYYY-MM-DD>` to preserve/share a specific mission-board date context
- `/daily-missions/?date=<YYYY-MM-DD>&mission=<mission-key>` to open with one mission preselected
- `/daily-missions/?dailyMissionsManifestUrl=<absolute-url>` to force one explicit manifest URL during local debugging

## Local DB explorer

For private local SQLite exploration (no backend, no upload to remote services), run `python scripts/serve_local_preview.py` and open:

- `http://localhost:4173/tools/aircraft-db-explorer.html`

Then load `aircraft_data.db` from your machine using the file picker.

## Local inferred-mapping reviewer

To review medium/ambiguous inferred rows locally, run `python scripts/serve_local_preview.py` and open:

- `http://localhost:4173/tools/inferred-mapping-reviewer.html`

Load `output/inferred_aircraft_type_mappings.json`, review rows, and export decision JSON.

## Usage flow

1. A short private startup screen appears while Skyviz checks for saved local data on the current device.
2. If no saved data is restored, Skyviz shows a privacy-first landing view with the `Skyviz` title stack, a short daily-aviation CTA hub for `Navdle`, `Cardle`, and the standalone daily-missions board, the upload card, and export instructions (linked to `github.com/mfkp/skycards-export`).
3. The `Navdle` and `Cardle` landing cards plus the `Daily Missions` launch card all open without requiring a Skycards upload. Daily guesses, unlocks, streaks, and share-state stay in browser local storage only on the current device.
4. (Optional) Enable the local save checkbox to keep the uploaded export in browser storage on the current device.
5. Either upload your own Skycards export JSON file, use the repo-root `skycards_user.json` fixture for real-data validation (`http://localhost:4173/?devLoad=skycards_user` during local preview or manual upload), or use `View Example Dashboard` only for the lightweight sample-deck flow (20 airports + 20 popular models).
6. During upload/example load, Skyviz reuses the private startup loading card so processing state is always visible while parsing and enrichment run.
7. Skyviz enriches the cards and airport unlocks with the committed reference snapshots.
8. The app switches into a tabbed dashboard shell. `Navdle` and `Cardle` are always available; `Map` and `Deck` unlock after an upload or example deck load.
9. Use the compact `Daily Missions` launch card and data-tools icon next to the tab toggle to either open the standalone mission board in a new tab or manage the active dashboard: upload a new export, turn browser-local save on or off for the current upload, or clear current and saved local data.
10. Use the `Navdle` tab for the airport mini-game: the hero centers a larger airport search bar, gives the `Navdle` title stronger typographic priority, keeps a compact top-right grid for reset/streak/win-rate chips, and uses a tighter guesses-left plus hint row so more vertical room stays available for the guess board. The landing-page Navdle teaser keeps only `Streak` and `Reset` chips so the home-page CTA stays lighter. Visible guess submission is driven directly from search suggestions or the keyboard Enter key on exact matches, so the old oversized submit button is gone and the hero input is more compact. The guess meter distinguishes solid used markers from the outlined current slot so the next attempt reads clearly. A static `Best so far` tracker row stays above the guess trail while the board is unsolved and keeps the strongest clue the player has seen in each category, preserving exact matches in green while carrying forward the closest logged value elsewhere. Guesses stack in a connected top-down timeline, and the between-guess chips call out explicit per-category changes like distance, direction, elevation, runway count, navaids, and location matches instead of aggregate summaries. Those transition chips omit categories that are already exact on the newer guess so the rail only highlights unresolved clues. On phone-sized viewports, the guess history compresses into denser two-column clue cards with swipeable transition rails so more of the board stays visible without losing clue detail. Autocomplete suggestions prioritize larger and scheduled-service airports for broad text searches, and every clue tile includes a `?` explainer for what that category means. The weekly UTC theme cadence now rotates only `Wildcard`, `Hub`, and `Regional` days (`Wildcard` on Sunday and Saturday, `Hub` on Monday and Tuesday, `Regional` on Wednesday through Friday), and the small-airport pool only keeps airports with an IATA code plus at least three published frequency entries so obviously niche fields stop dominating the draw while recognizable municipals still stay eligible. Those explainers now shift and flip within the active viewport instead of overflowing off-screen on tighter layouts or lower rows. Search matching now folds accents as well, so plain-text queries like `cancun` still find `Cancun`. Each clue box uses a muted category label with the actual value as the main visual focus, and only the distance clue keeps the extra compass meta line so the rest of the grid reads more cleanly. The hint system auto-reveals progressively after guesses `3`, `5`, `7`, and the final guess, surfacing one clue at a time from the airport's queued open-data hints. Recent community notes are used first when available, then fallback derived clues fill any remaining slots. Community-note hints still redact direct airport identifiers until the answer is revealed, and the solved/revealed answer card recaps the full hint stack with the caution copy intact. The streak and win-rate area includes an explicit privacy note that those stats stay in browser local storage on the current device only. Solving the board triggers a one-shot celebration burst in the daily shell, pulses the streak and win-rate chips when they change, and keeps `Copy results` next to the revealed answer so the share-ready Wordle-style clipboard export stays available on both direct hits and revealed losses: a single header line plus one emoji row per guess, with an optional hint marker when a hint was used, followed by a direct link back to the daily game at `#navdle`. The daily game credits [OurAirports open data](https://ourairports.com/data/) directly in muted in-UI attribution text.
    On mobile, the `Reset`, `Streak`, and `Win rate` chips stay compressed into a single row so they do not steal vertical room from the guesses.
    Community-note hints keep airport names visually concealed with a styled redaction treatment instead of a raw `[redacted]` token, and the full note is still restored once the answer is revealed.
11. Use the `Cardle` tab for the aircraft-model mini-game: the command deck mirrors Navdle so the two games feel related, and it now uses the same tighter guesses-left progress strip directly under search. The player gets `8` total guesses, enters ICAO/manufacturer/model search terms, and each submitted row recolors eight stat cells (`first flight`, `rarity`, `wingspan`, `speed`, `range`, `ceiling`, `seats`, `weight`) into gray/yellow/green higher-lower-exact feedback just like Navdle's comparison language. Previous guesses still prioritize a larger aircraft image and slimmer stat tiles so the thumbnail stays visible instead of getting buried by the comparison grid. The live comparison card now behaves like Navdle's pinned `Best so far` tracker: it starts with `--` / `?` placeholders, keeps the closest logged clue in each tracked category, holds manufacturer and model name behind redaction boxes instead of mirroring the latest guess, swaps `Height` out for catchable-registration counts, and only locks the manufacturer open in green after an exact match. The registration-origin hotspot map and 3D model reveal stay in the same shell, with the map now leading on the left, both surfaces redacted at first, and the old stage headers/notes collapsed into on-surface overlay chips so the render area stays dominant. The hotspot map unlocks after guess `3`, the 3D reveal unlocks after guess `5`, and once the map is live the browser fetches live multipoint data from `https://api.skycards.oldapes.com/models/multipoint/{icao}` and plots those returned coordinates into an interactive Leaflet world map that reuses the same base-map runtime as the main `Map` tab. Solving now reuses Navdle-style celebration and reveal treatment, including the same share-action styling, while solved and lost states reveal the full target profile, the hotspot count, and a share-ready results grid linked back to `#cardle`. Cardle now initializes from the lighter models-plus-registration-count reference path instead of the full dashboard reference bundle, and both direct `#navdle` / `#cardle` loads and first-open daily-tab transitions keep the boot screen visible until the requested daily shell is interactive instead of exposing a blocked dashboard.
12. Use the `Map` tab for captured vs missing airport plotting with airport completion shown directly on the map card plus a single right-side `Airport completion explorer` drill-down panel. The drill path is `Continents -> Countries -> US states` (US states appear when `United States` is selected). Continents and the `United States` row show explicit drill cues, and the panel includes helper copy plus `Back` + breadcrumb controls so it is always clear where you are in the hierarchy. Clicking a row focuses/highlights/zooms the map for that region and advances the drill level when a deeper level exists. The widget also includes explicit sort-category selection (`% complete`, `total airports`, `captured airports`, `name`), an adjacent ascending/descending arrow toggle (default `total airports` descending), and a `Details` expander per row with captured/remaining code lists plus per-scope `Copy` / `Export` actions. Airport dots scale up as you zoom in so map targets stay easier to click. Airport popups show `ICAO (IATA)` when available, the airport name, and direct links for both `View on FR24` and `View on Skydex`. At higher zoom levels, muted airport code labels render over dots with a cap to avoid excessive overlap. A `Completionist mode` toggle swaps that drill-down view for a live-flight hunter that checks a shared delayed snapshot against your local missing airports and missing aircraft cards, ignores live feed rows that do not include a usable registration, scales aircraft markers by map zoom, pairs live sidebar search with a compact sort control, keeps only smaller `Missing airport` and `New card` pills (both enabled by default and independently toggleable), groups the live results by the busiest airport/card targets when sorting by traffic, trims the right-hand header down further to a single inline `Refresh in ...` / `Snapshot ... ago` status line plus the essential snapshot actions, hides the base map legend while the live-hunter view is active, and keeps map clicks and sidebar selection locked to one stable highlighted result row without runaway auto-scrolling. Each completionist row now leads with the aircraft name plus ICAO type, keeps the age on the same line, shows the registration with optional callsign in muted text, compresses the route to IATA codes plus full airport names, can surface compact grouped-flight badges when traffic sorting is active, reuses the same aircraft marker artwork as the live map between origin and destination, and keeps the `Open in FR24` plus session-only `Hide airport` / `Hide aircraft` actions inside the card surface for faster scanning with matched typography across those action controls. When a focused completionist flight also represents a missing airport target and the destination airport has valid reference coordinates, the map adds a temporary destination point and fits the focused view to both the aircraft and that missing airport. Completionist popups mirror that same compact aircraft-first hierarchy, and clicking the selected aircraft again or using the popup `X` clears focus cleanly. Background rerenders now preserve the current airport/completionist pan and zoom, so only explicit map-reset and focus actions move the viewport. Completionist summary text and target-pill counts use unique target counts, so repeated flights to the same missing airport or repeated sightings of the same missing aircraft card do not inflate those totals.
13. On viewports larger than tablet, the default map view uses a 50/50 split: a full-height map card on the left and a full-height drill-down completion card on the right with vertical scrolling for long lists. When completionist mode is enabled, the map widens and the sidebar narrows to favor the live flight view. On tablet and phone widths, the layout collapses back to a clean single-column stack, the completionist toggle compacts into a smaller control, and the live-flight hunter stays usable without side-by-side overflow.
14. Use the `Deck` tab in a split layout similar to `Map`: a large virtualized aircraft card deck on the left (or top on mobile) plus four interaction panels on the right (`Progress by type`, `Progress by category`, `Glows by tier`, `XP by tier`). Aircraft right-panel rows intentionally mirror the map explorer row UI/UX (same row structure, focus behavior, and details affordance) so interactions stay predictable across tabs. Clicking a row focuses/filters the deck by that slice, while `Details` only expands when the row's `Details` button is clicked. Expanded details keep completed model lists as `ICAO - name`, while missing-model details now render FR24-ready raw CSV ICAO sections chunked to `99` codes each with per-section copy actions plus export.
15. Aircraft cards render model imagery from tier-aware Skycards CDN paths (`.../models/images/1/{tier}/{ICAO}_md.png`; tier comes from the model's dominant card tier in your deck). If the direct model image is missing, Skyviz falls back through the `cyber` tier and then through reference metadata aliases (`imageOverride`, then `images[]`) before showing `Image unavailable`. Clicking anywhere else on a card opens an aircraft detail modal with collection KPIs plus latent reference metadata such as engine count/type, range, ceiling, length, height, landing gear, wing position/shape, military status, and season span. That modal now opens directly into the optimized GLB preview through `model-viewer` when a matching 3D asset exists, without exposing a 2D media toggle. Cards still show XP plus a second badge for unique registrations caught (`caught / total possible` when reference counts are available), an XP-tier badge (`paper`, `bronze`, `silver`, `gold`, `platinum`, `cyber`), a six-stat grid (`first flight`, `rarity`, `wingspan`, `speed`, `seats`, `weight in tonnes`), and inline icon metrics under the model name for `Framing %` and `Cloud %`. Missing stat values render as `N/A` instead of `0`, and deck card height/spacing scales by viewport to keep these rows legible on mobile and less cramped on larger screens, while mobile deck totals (`Total XP`, `Total glows`, `Total regs`) stay in one row when viewport width allows. The deck header includes filtered totals for XP, glow count, and caught registrations that update with search/focus filters. Clicking a model's regs badge opens a dedicated caught-registration modal for that ICAO model with the same registration-accuracy caution copy used in the transparency flow. The orange caution icon in the aircraft deck header opens the global registration-transparency modal, listing each unique registration row with mapped transponder hex, confidence/ambiguity class, mapping notes, and inline manual-mapping controls for non-high-confidence rows (no browser prompt popups). Manual, high, medium, ambiguous, and low confidence chips are clickable filter shortcuts in the modal. Manual mappings are saved in browser local storage only; the modal includes warning copy plus `Export manual mappings` / `Import mappings` actions so users can back up and restore overrides when local browser storage is cleared. Sorting uses an explicit sort-category dropdown plus adjacent ascending/descending arrow control, matching the map completion sort pattern and supporting aircraft stat dimensions (`first flight`, `speed`, `rarity`, `seats`, `wingspan`, `weight`) alongside deck metrics.
16. Dashboard cards use responsive layouts and collapse to single-column full-width flows on mobile viewports.
17. Local-save restore notices appear as dismissible overlay toasts with a 10-second countdown.
18. A structured footer is always available with quick links, privacy reminders, browser-local processing context, the OurAirports daily-game attribution link, and the Cardle hotspot-hint disclosure that live model-origin coordinates are fetched only after the reveal unlocks.
19. The standalone `/daily-missions/` page now opens in `All missions` mode with no standalone hero, a more visual desktop command header that carries the mission filters, a viewport-bounded map-and-rail workspace, finder values placed above live matches in the right rail, and a mobile flow that keeps the map first while still exposing the rail immediately below for easy scrolling. Its map now uses real aircraft model silhouettes rotated to the live heading when `track` is available, keeps mission identity through compact mission badges instead of generic number discs, upgrades marker popups with registration / ICAO / speed / altitude detail, adds a compact `Map detail` control so the user can keep the map clean or pin selected-flight telemetry on demand, and preserves the current pan/zoom during background refreshes unless the user explicitly changes mission scope or focuses a flight.

## Validation

```bash
python scripts/repo_hygiene_check.py
python scripts/smoke_check.py
```

`smoke_check.py` validates the repo-root `skycards_user.json` real-data fixture when it is available locally, but GitHub Actions and other CI environments skip that private-fixture assertion when the file is not present.
Use `python scripts/export_skycards_user.py --export-now` when you need to refresh that private fixture locally.

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

## Refreshing the completionist live snapshot

Production completionist refreshes are Cloudflare-native. `scripts/refresh_completionist_snapshot.py` now exists as the local fixture generator for preview, smoke checks, and offline debugging. It does not control the production refresh cadence.

Refresh it locally with:

```bash
python scripts/refresh_completionist_snapshot.py
```

Useful flags:

```bash
python scripts/refresh_completionist_snapshot.py --max-requests 48
python scripts/refresh_completionist_snapshot.py --initial-tile-degrees 45
python scripts/refresh_completionist_snapshot.py --min-tile-degrees 7.5
python scripts/refresh_completionist_snapshot.py --request-delay 0.1
```

The script writes:

- `site/data/live/completionist-manifest.json`
- `site/data/live/completionist-snapshot.json`

Production daily-missions reads are browser-consumer only. The page resolves the shared manifest from `site/data/runtime-config.json`, tries the optional local fixture path `site/data/live/daily-missions-manifest.json` first during localhost preview, and falls back to the shared live Cloudflare manifest when that local fixture is not present.

## GitHub Pages

The repository includes a Pages deployment workflow that publishes the `site/` directory. The workflow expects the repository to be connected to GitHub and Pages to be configured for GitHub Actions deployment.

During Pages builds, the workflow refreshes:

- `models.json` / `airports.json`
- `model_registration_counts.json`
- `aircraft_lookup.json` only when `aircraft_data.db` is present in the build workspace
- `manifest.json` after optional reference artifacts are generated so deployed browsers can discover them
- the OurAirports CSV snapshots plus `site/data/airports/daily-game.json` / `site/data/airports/manifest.json` for `Navdle`

Push and manual Pages builds refresh the static shell's slower-moving generated artifacts. They no longer republish the site just to update completionist hot data.

## Cloudflare completionist data plane

Production completionist reads come from the active source configured in `site/data/runtime-config.json`. During the fr24 shared-data rollout, Skyviz keeps two Cloudflare producer definitions:

- `skyvizLegacy`: the current Skyviz-owned `workers/completionist-live/` pipeline
- `fr24Shared`: the fr24-derived completionist manifest published by `fr24-discord-bot`

The browser reads only one active manifest at a time, but the runtime config keeps both active and shadow sources explicit so parity checks and eventual cutover do not require code changes.

As of `2026-03-24`, the cutover target is `fr24Shared` with `skyvizLegacy` kept as the shadow rollback source during burn-in. The deciding check was user-visible completionist parity against the repo-root `skycards_user.json` fixture: `705` legacy displayable targets vs `712` fr24-shared displayable targets, with `701` overlapping, `4` legacy-only, and `11` fr24-shared-only.

All Cloudflare write operations in this repository must target:

- email: `seansailer28@gmail.com`
- account id: `172da47da00e3b33810d2e9c73c9a0b9`

Verify that before any `wrangler` write command:

```bash
python scripts/check_cloudflare_account.py
```

Provision and deploy the legacy Skyviz completionist runtime with:

```bash
python scripts/check_cloudflare_account.py
cd workers/completionist-live
npx wrangler r2 bucket create skyviz-completionist-live --config wrangler.provision.jsonc
npx wrangler queues create skyviz-completionist-tile-fetch --config wrangler.provision.jsonc --message-retention-period-secs 86400
npx wrangler queues create skyviz-completionist-tile-dlq --config wrangler.provision.jsonc --message-retention-period-secs 86400
npx wrangler deploy
```

The worker keeps the stable manifest URL short-lived and publishes versioned snapshots under immutable run keys in `R2`. Browsers fetch the stable manifest first, then resolve the versioned snapshot from that manifest.

Per-tile staging artifacts are deleted after publish, and older versioned run artifacts are pruned on a short retention window so the bucket does not accumulate unnecessary storage bloat.

During burn-in, compare the runtime-config active and shadow sources with:

```bash
python scripts/compare_completionist_sources.py
```

This repository ignores generated files under `site/data/reference/*`, `site/data/airports/*.csv` / `site/data/airports/daily-game.json` / `site/data/airports/manifest.json`, and `site/data/live/*.json` in git. CI and Pages workflows generate fresh reference and airport artifacts before validation/deploy. Cardle continues to run from the committed reference snapshots; its hotspot hint depends on live browser access to the Skycards multipoint endpoint at play time, while completionist mode reads the delayed snapshot from Cloudflare in production and from local fixtures during preview.
