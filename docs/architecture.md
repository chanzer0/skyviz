# Architecture

## Components

- Static application shell in `site/index.html`.
- Visual system and responsive layout in `site/styles.css`.
- Browser runtime in `site/src/main.js`.
- Daily airport-game helpers in `site/src/daily.js`.
- Daily aircraft-game helpers in `site/src/cardle.js`.
- Collection parsing, enrichment, and derived metrics in `site/src/data.js`.
- Continent lookup map in `site/src/continents.js`.
- SVG and HTML chart helpers in `site/src/charts.js`.
- Generated OurAirports snapshots and daily-game dataset in `site/data/airports/`.
- Generated completionist-mode live snapshot artifacts in `site/data/live/`.
- Built-in example collection deck in `site/data/example/try_now_user.json`.
- Local-only SQLite explorer in `site/tools/aircraft-db-explorer.html` for inspecting `aircraft_data.db` in-browser.
- Local-only inference reviewer in `site/tools/inferred-mapping-reviewer.html` for medium/ambiguous mapping triage.
- Optional inferred-mapping snapshot `site/data/reference/inferred_aircraft_type_mappings.json` for registration-confidence transparency in the aircraft deck.
- CDN route reference artifact in repo root `cdn_index.json` for debugging/validating `https://cdn.skycards.oldapes.com/assets` path coverage.
- Leaflet runtime assets loaded from CDN in `site/index.html` for the interactive airport map.
- `model-viewer` loaded from CDN in `site/index.html` for the aircraft detail modal's default GLB preview.
- Reference snapshot refresh tooling in `scripts/refresh_reference_data.py`.
- OurAirports refresh/build tooling for the daily airport game in `scripts/refresh_airport_game_data.py`.
- Completionist snapshot refresh tooling in `scripts/refresh_completionist_snapshot.py`.
- Model registration-count refresh tooling in `scripts/refresh_model_registration_counts.py`.
- Aircraft `aircraftId` lookup builder in `scripts/build_aircraft_lookup_from_db.py` (from local `aircraft_data.db`).
- Inference/review pipeline for unresolved registration rows in `scripts/build_inferred_aircraft_mappings.py`.
- Resolved-lookup merge pipeline in `scripts/build_resolved_aircraft_lookup.py`.
- Offline repo validation in `scripts/repo_hygiene_check.py` and `scripts/smoke_check.py`.
- GitHub Pages deployment in `.github/workflows/deploy-pages.yml`.

## Data flow

1. A user opens the static site from GitHub Pages.
2. The user can open either always-available daily game directly from the landing view without uploading a Skycards export.
3. For `Navdle`, the browser loads the generated airport manifest and derived daily-game dataset from `site/data/airports/`, restores the current UTC day's guesses from browser `localStorage`, and picks the airport of the day deterministically from the generated pool.
4. For `Cardle`, the browser loads the committed Skycards reference snapshots, derives a guessable aircraft-model pool from `models.json`, restores the current UTC day's guesses from browser `localStorage`, and picks the model of the day deterministically from that reference pool.
5. The user can alternatively upload a Skycards export JSON file or use the landing-page `View Example Dashboard` button to load a built-in sample deck.
6. Optional: if the user enables local persistence, the active uploaded export is cached in browser storage on that device (IndexedDB first, with legacy `localStorage` migration) and can be restored on next visit.
7. The browser validates the payload shape and loads static reference snapshots (`models.json`, `airports.json`, and any optional datasets listed in `manifest.json`).
8. Aircraft cards are enriched by `card.modelId -> models.rows[].id`.
9. Airport unlocks are enriched by `unlockedAirportIds[] -> airports.rows[].id`.
10. The app computes tab-specific view models in memory:
  - one airport-daily game state machine for `Navdle`, with hero-search state, guesses-left tracking, guess history, a pinned best-so-far comparison tracker, per-category comparison tiles, viewport-aware clue explainers, a progressive multi-hint queue, a UTC weekly `wildcard` / `hub` / `regional` cadence, streak statistics, emoji share-grid generation with a direct `#navdle` link for both solved and revealed boards, and legacy `#tab-daily` hash compatibility
- one aircraft-daily game state machine for `Cardle`, with hero-search state, a tighter shared Navdle-style guesses-left strip, eight-guess tracking, a pinned best-so-far comparison intel card with redacted manufacturer/name clues, catchable-registration tracking in place of height, image-forward history rows with denser stat tiles, a wider registration-origin visual stage, on-surface overlay status chips instead of separate stage headers/notes, eight-stat higher-lower comparison feedback, staged hotspot/model reveals, Navdle-style solved-state celebration and share-action treatment, live share-grid generation with a direct `#cardle` link, and a runtime fetch for registration-origin hotspots after the map hint unlocks
  - airport capture progress across all committed reference airports
  - aircraft analytics, progress widgets, and a virtualized aircraft card deck
  - per-model caught registration counts by decoding `uniqueRegs[].aircraftId` (decimal ICAO transponder) into hex and joining against the local aircraft lookup snapshot
  - per-registration mapping diagnostics (hex vs registration fallback, confidence class, ambiguity status, and optional inference hints) shown by the aircraft caution modal
  - browser-local manual registration overrides (for non-high-confidence rows) merged into mapping results before dashboard rendering
  - per-model total possible registration counts from `/models/count/{icao}` snapshots
  - aircraft image candidates resolved as tier-aware CDN URLs using `*_md.png` first, then `cyber` tier + model metadata alias fallback (`imageOverride`, `images[]`)
  - aircraft detail modal metadata slices for engine profile, performance, airframe geometry, military status, and seasonal span
  - aircraft detail media candidates resolved from optimized Skycards CDN GLB assets
  - completionist-mode flight matches built by comparing the shared delayed snapshot in `site/data/live/` against the current user's missing airport unlocks and missing aircraft models entirely in-browser
11. The loaded UI transitions to a tabbed dashboard (`Navdle`, `Cardle`, `Map`, and `Deck`) without sending upload data to any server. The two daily tabs remain available even when no collection upload is active.

## Completionist live snapshot contract

Completionist mode does not fetch its upstream live-flight feed directly from the browser.

- `scripts/refresh_completionist_snapshot.py` runs an adaptive world sweep against the upstream completionist feed during GitHub Actions builds
- the script requests bounded tiles with `limit=5000`, `air=1`, `gnd=0`, and the other feed flags needed for the live aircraft view
- the sweep starts with coarse world tiles, treats `1500` returned rows as a cap signal, and recursively splits only capped tiles until they fall below the cap, hit the minimum tile size, or hit the per-run request budget
- rows are merged and deduped by `flightId` before publish because adjacent tiles overlap and aircraft move while the sweep is in flight
- the script writes `site/data/live/completionist-manifest.json` and `site/data/live/completionist-snapshot.json`
- the browser polls those static artifacts every `60` seconds while completionist mode is enabled and the `Map` tab is active
- scheduled Pages runs refresh only that snapshot on an approximately `5` minute cadence, so the browser sees a delayed shared feed while the user's collection matching remains local
- the snapshot payload keeps only the fields needed for matching and map rendering: flight id, aircraft hex, coordinates, heading, altitude, speed, type code, registration, seen time, origin, destination, flight number, and callsign
- snapshot metadata keeps only the browser-facing refresh contract: generated time, row count, field order, and refresh cadence

## Reference data contract

Skycards reference data is fetched from:

- `GET https://api.skycards.oldapes.com/models`
- `GET https://api.skycards.oldapes.com/airports`
- `GET https://api.skycards.oldapes.com/models/count/{icao}`
- `GET https://api.skycards.oldapes.com/models/multipoint/{icao}` for Cardle's hotspot hint

Required request headers:

- `Accept: application/json`
- `x-client-version: 2.0.24`

The reference snapshots keep the site self-contained for GitHub Pages and make agent work deterministic:

- `scripts/refresh_reference_data.py` writes `models.json` / `airports.json`, and it can also rebuild `manifest.json` from the current contents of `site/data/reference/` so optional local artifacts are discoverable by the browser.
- `scripts/refresh_model_registration_counts.py` writes `model_registration_counts.json`.
- `scripts/build_aircraft_lookup_from_db.py` writes `aircraft_lookup.json` from the local SQLite snapshot (`aircraft_data.db`).

## Navdle airport daily game data contract

The `Navdle` airport game uses generated artifacts under `site/data/airports/`:

- `scripts/refresh_airport_game_data.py` downloads the OurAirports CSV snapshots (`airports`, `runways`, `navaids`, `airport-frequencies`, `airport-comments`, `countries`, `regions`)
- the same script builds `daily-game.json`, a curated browser payload of guessable airports plus derived runway, navaid, frequency, and recent community-note metadata; small airports only stay in that guessable payload when they have an `iataCode` and at least `3` published frequency entries
- the same script builds `manifest.json`, which gives the browser a stable way to discover the daily-game payload and expose source attribution

The browser does not parse the raw CSVs directly during normal gameplay. It loads the generated JSON so the static site stays responsive on GitHub Pages. The weekly Navdle theme rotation uses only `wildcard`, `hub`, and `regional` challenge days; `frontier` is no longer a scheduled day-of-week theme.

## Cardle aircraft daily runtime contract

`Cardle` does not use a separate generated daily dataset.

- the browser derives the daily model pool directly from `site/data/reference/models.json`
- it uses `model_registration_counts.json` when available to improve suggestion ranking and teaser counts, but the daily game still works without that optional snapshot
- first-open Cardle loads only the reference manifest, `models.json`, and optional `model_registration_counts.json`; it does not block on the full dashboard lookup/airport reference bundle
- before the board is revealed, the live intel card stays partially redacted, keeps the strongest clue earned so far in each tracked category, and only unlocks manufacturer identity after the player logs an exact manufacturer match
- after guess `3`, the browser may fetch `GET /models/multipoint/{icao}` live from the Skycards API and project the returned `MultiPoint` coordinates into an interactive Leaflet world map that reuses the same tile runtime as the main `Map` tab
- after guess `5`, the browser reveals the optimized GLB preview already used elsewhere in the site
- whenever a daily route transition would otherwise leave the shell blocked on data, the app reuses the boot/loading screen and only reveals the requested daily tab once it is interactive

## Browser-only product constraints

- The app stays static and deployable to GitHub Pages.
- User uploads are processed locally in the browser, with optional user-controlled browser-storage persistence.
- Navdle and Cardle guesses, reveal state, and streaks are browser-local (`localStorage`) only.
- Manual registration overrides are also browser-local (`localStorage`) and can be exported/imported for backup and restore.
- Reference snapshots are committed artifacts so the site works without a runtime API dependency.
- Completionist mode reads a delayed shared flight snapshot from GitHub Pages, but it still matches that snapshot against the user's collection locally in-browser.
- Cardle's hotspot hint is the only direct browser fetch to an external gameplay API, and it happens only after the in-game unlock threshold is reached.
- There is no authentication, persistence layer, or custom backend.

## Primary repository surfaces

- `site/index.html`: layout shell and upload affordances.
- `site/src/main.js`: file loading, status banners, tab state, Leaflet map orchestration, and virtualized aircraft list rendering.
- `site/src/daily.js`: airport daily-game selection, search, comparison, hint, and streak helpers.
- `site/src/cardle.js`: aircraft daily-game selection, search, comparison, hotspot, and share helpers.
- `site/src/data.js`: validation, normalization, enrichment, and tab-specific dashboard model building.
- `site/src/continents.js`: country-to-continent mapping used for airport continent progress.
- `site/src/charts.js`: stacked ribbons, bars, scatter plots, and geo-style plots.
- `site/data/airports/`: generated OurAirports CSV snapshots plus the derived airport daily manifest and dataset.
- `site/data/live/`: generated completionist-mode flight snapshot and manifest.
- `site/tools/aircraft-db-explorer.html`: local SQLite database explorer UI.
- `site/tools/inferred-mapping-reviewer.html`: local review UI for inferred mapping decisions.
- `site/data/reference/`: committed reference snapshots and manifest.
- `scripts/refresh_reference_data.py`: official snapshot refresh path.
- `scripts/refresh_airport_game_data.py`: refreshes OurAirports source CSVs and rebuilds the daily-game dataset.
- `scripts/refresh_completionist_snapshot.py`: fetches and reduces the completionist-mode live flight snapshot for Pages deployment.
- `scripts/refresh_model_registration_counts.py`: refreshes per-model total registration counts.
- `scripts/build_aircraft_lookup_from_db.py`: builds `aircraftId` to model lookup from SQLite data.
- `scripts/build_inferred_aircraft_mappings.py`: generates inferred type-code artifacts and manual-review queues for unresolved rows.
- `scripts/build_resolved_aircraft_lookup.py`: merges high-confidence inferred rows into a consumable lookup snapshot.
