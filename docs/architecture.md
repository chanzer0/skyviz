# Architecture

## Components

- Static application shell in `site/index.html`.
- Visual system and responsive layout in `site/styles.css`.
- Browser runtime in `site/src/main.js`.
- Daily airport-game helpers in `site/src/daily.js`.
- Collection parsing, enrichment, and derived metrics in `site/src/data.js`.
- Continent lookup map in `site/src/continents.js`.
- SVG and HTML chart helpers in `site/src/charts.js`.
- Generated OurAirports snapshots and daily-game dataset in `site/data/airports/`.
- Built-in example collection deck in `site/data/example/try_now_user.json`.
- Local-only SQLite explorer in `site/tools/aircraft-db-explorer.html` for inspecting `aircraft_data.db` in-browser.
- Local-only inference reviewer in `site/tools/inferred-mapping-reviewer.html` for medium/ambiguous mapping triage.
- Optional inferred-mapping snapshot `site/data/reference/inferred_aircraft_type_mappings.json` for registration-confidence transparency in the aircraft deck.
- CDN route reference artifact in repo root `cdn_index.json` for debugging/validating `https://cdn.skycards.oldapes.com/assets` path coverage.
- Leaflet runtime assets loaded from CDN in `site/index.html` for the interactive airport map.
- `model-viewer` loaded from CDN in `site/index.html` for the aircraft detail modal's default GLB preview.
- Reference snapshot refresh tooling in `scripts/refresh_reference_data.py`.
- OurAirports refresh/build tooling for the daily airport game in `scripts/refresh_airport_game_data.py`.
- Model registration-count refresh tooling in `scripts/refresh_model_registration_counts.py`.
- Aircraft `aircraftId` lookup builder in `scripts/build_aircraft_lookup_from_db.py` (from local `aircraft_data.db`).
- Inference/review pipeline for unresolved registration rows in `scripts/build_inferred_aircraft_mappings.py`.
- Resolved-lookup merge pipeline in `scripts/build_resolved_aircraft_lookup.py`.
- Offline repo validation in `scripts/repo_hygiene_check.py` and `scripts/smoke_check.py`.
- GitHub Pages deployment in `.github/workflows/deploy-pages.yml`.

## Data flow

1. A user opens the static site from GitHub Pages.
2. The user can open the `DAILY` airport game directly from the landing view without uploading a Skycards export.
3. For the daily game, the browser loads the generated airport manifest and derived daily-game dataset from `site/data/airports/`, restores the current UTC day's guesses from browser `localStorage`, and picks the airport of the day deterministically from the generated pool.
4. The user can alternatively upload a Skycards export JSON file or use the landing-page `View Example Dashboard` button to load a built-in sample deck.
5. Optional: if the user enables local persistence, the active deck is cached in browser `localStorage` on that device and can be restored on next visit.
6. The browser validates the payload shape and loads static reference snapshots (`models.json`, `airports.json`, and any optional datasets listed in `manifest.json`).
7. Aircraft cards are enriched by `card.modelId -> models.rows[].id`.
8. Airport unlocks are enriched by `unlockedAirportIds[] -> airports.rows[].id`.
9. The app computes tab-specific view models in memory:
  - one airport-daily game state machine for `Navdle`, with hero-search state, guesses-left tracking, guess history, a pinned best-so-far comparison tracker, per-category comparison tiles, hint state, streak statistics, emoji share-grid generation with a direct `#navdle` link, and legacy `#tab-daily` hash compatibility
   - airport capture progress across all committed reference airports
   - aircraft analytics, progress widgets, and a virtualized aircraft card deck
   - per-model caught registration counts by decoding `uniqueRegs[].aircraftId` (decimal ICAO transponder) into hex and joining against the local aircraft lookup snapshot
   - per-registration mapping diagnostics (hex vs registration fallback, confidence class, ambiguity status, and optional inference hints) shown by the aircraft caution modal
   - browser-local manual registration overrides (for non-high-confidence rows) merged into mapping results before dashboard rendering
   - per-model total possible registration counts from `/models/count/{icao}` snapshots
   - aircraft image candidates resolved as tier-aware CDN URLs using `*_md.png` first, then `cyber` tier + model metadata alias fallback (`imageOverride`, `images[]`)
   - aircraft detail modal metadata slices for engine profile, performance, airframe geometry, military status, and seasonal span
   - aircraft detail media candidates resolved from optimized Skycards CDN GLB assets
10. The loaded UI transitions to a tabbed dashboard (`Map`, `Deck`, and `DAILY`) without sending upload data to any server. `DAILY` remains available even when no collection upload is active.

## Reference data contract

Skycards reference data is fetched from:

- `GET https://api.skycards.oldapes.com/models`
- `GET https://api.skycards.oldapes.com/airports`
- `GET https://api.skycards.oldapes.com/models/count/{icao}`

Required request headers:

- `Accept: application/json`
- `x-client-version: 2.0.24`

The reference snapshots keep the site self-contained for GitHub Pages and make agent work deterministic:

- `scripts/refresh_reference_data.py` writes `models.json` / `airports.json`, and it can also rebuild `manifest.json` from the current contents of `site/data/reference/` so optional local artifacts are discoverable by the browser.
- `scripts/refresh_model_registration_counts.py` writes `model_registration_counts.json`.
- `scripts/build_aircraft_lookup_from_db.py` writes `aircraft_lookup.json` from the local SQLite snapshot (`aircraft_data.db`).

## Airport daily game data contract

The `DAILY` airport game uses generated artifacts under `site/data/airports/`:

- `scripts/refresh_airport_game_data.py` downloads the OurAirports CSV snapshots (`airports`, `runways`, `navaids`, `airport-frequencies`, `airport-comments`, `countries`, `regions`)
- the same script builds `daily-game.json`, a curated browser payload of guessable airports plus derived runway, navaid, frequency, and comment metadata
- the same script builds `manifest.json`, which gives the browser a stable way to discover the daily-game payload and expose source attribution

The browser does not parse the raw CSVs directly during normal gameplay. It loads the generated JSON so the static site stays responsive on GitHub Pages.

## Browser-only product constraints

- The app stays static and deployable to GitHub Pages.
- User uploads are processed locally in the browser, with optional user-controlled `localStorage` persistence.
- Daily airport guesses, hint state, and streaks are also browser-local (`localStorage`) only.
- Manual registration overrides are also browser-local (`localStorage`) and can be exported/imported for backup and restore.
- Reference snapshots are committed artifacts so the site works without a runtime API dependency.
- There is no authentication, persistence layer, or custom backend.

## Primary repository surfaces

- `site/index.html`: layout shell and upload affordances.
- `site/src/main.js`: file loading, status banners, tab state, Leaflet map orchestration, and virtualized aircraft list rendering.
- `site/src/daily.js`: airport daily-game selection, search, comparison, hint, and streak helpers.
- `site/src/data.js`: validation, normalization, enrichment, and tab-specific dashboard model building.
- `site/src/continents.js`: country-to-continent mapping used for airport continent progress.
- `site/src/charts.js`: stacked ribbons, bars, scatter plots, and geo-style plots.
- `site/data/airports/`: generated OurAirports CSV snapshots plus the derived airport daily manifest and dataset.
- `site/tools/aircraft-db-explorer.html`: local SQLite database explorer UI.
- `site/tools/inferred-mapping-reviewer.html`: local review UI for inferred mapping decisions.
- `site/data/reference/`: committed reference snapshots and manifest.
- `scripts/refresh_reference_data.py`: official snapshot refresh path.
- `scripts/refresh_airport_game_data.py`: refreshes OurAirports source CSVs and rebuilds the daily-game dataset.
- `scripts/refresh_model_registration_counts.py`: refreshes per-model total registration counts.
- `scripts/build_aircraft_lookup_from_db.py`: builds `aircraftId` to model lookup from SQLite data.
- `scripts/build_inferred_aircraft_mappings.py`: generates inferred type-code artifacts and manual-review queues for unresolved rows.
- `scripts/build_resolved_aircraft_lookup.py`: merges high-confidence inferred rows into a consumable lookup snapshot.
