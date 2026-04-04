# Architecture

## Components

- Static application shell in `site/index.html`.
- Standalone daily-missions shell in `site/daily-missions/index.html`.
- Visual system and responsive layout in `site/styles.css`.
- Daily-missions page-specific layout in `site/daily-missions/styles.css`.
- Browser runtime in `site/src/main.js`.
- Standalone daily-missions runtime in `site/src/daily-missions-main.js`.
- Daily airport-game helpers in `site/src/daily.js`.
- Daily aircraft-game helpers in `site/src/cardle.js`.
- Collection parsing, enrichment, and derived metrics in `site/src/data.js`.
- Continent lookup map in `site/src/continents.js`.
- SVG and HTML chart helpers in `site/src/charts.js`.
- Generated OurAirports snapshots and daily-game dataset in `site/data/airports/`.
- Production completionist runtime source selection in `site/data/runtime-config.json`.
- Production daily-missions manifest selection in `site/data/runtime-config.json`.
- Local/offline completionist fixture artifacts in `site/data/live/`.
- Built-in example collection deck in `site/data/example/try_now_user.json`.
- Local-only SQLite explorer in `site/tools/aircraft-db-explorer.html` for inspecting `aircraft_data.db` in-browser.
- Local-only inference reviewer in `site/tools/inferred-mapping-reviewer.html` for medium/ambiguous mapping triage.
- Optional inferred-mapping snapshot `site/data/reference/inferred_aircraft_type_mappings.json` for registration-confidence transparency in the aircraft deck.
- CDN route reference artifact in repo root `cdn_index.json` for debugging/validating `https://cdn.skycards.oldapes.com/assets` path coverage.
- Leaflet runtime assets loaded from CDN in `site/index.html` for the interactive airport map.
- `model-viewer` loaded from CDN in `site/index.html` for the aircraft detail modal's default GLB preview.
- Reference snapshot refresh tooling in `scripts/refresh_reference_data.py`.
- OurAirports refresh/build tooling for the daily airport game in `scripts/refresh_airport_game_data.py`.
- Completionist local fixture refresh tooling in `scripts/refresh_completionist_snapshot.py`.
- Repo-aware localhost preview server in `scripts/serve_local_preview.py`.
- Local-only Skycards export fixture refresh tooling in `scripts/export_skycards_user.py`.
- Cloudflare account preflight tooling in `scripts/check_cloudflare_account.py`.
- Model registration-count refresh tooling in `scripts/refresh_model_registration_counts.py`.
- Aircraft `aircraftId` lookup builder in `scripts/build_aircraft_lookup_from_db.py` (from local `aircraft_data.db`).
- Inference/review pipeline for unresolved registration rows in `scripts/build_inferred_aircraft_mappings.py`.
- Resolved-lookup merge pipeline in `scripts/build_resolved_aircraft_lookup.py`.
- Offline repo validation in `scripts/repo_hygiene_check.py` and `scripts/smoke_check.py`.
- GitHub Pages deployment in `.github/workflows/deploy-pages.yml`.
- Legacy Skyviz-owned completionist worker runtime in `workers/completionist-live/`.

## Data flow

1. A user opens the static site from GitHub Pages.
2. The user can open either always-available daily game or the standalone `/daily-missions/` board directly from the landing view without uploading a Skycards export.
3. For `Navdle`, the browser loads the generated airport manifest and derived daily-game dataset from `site/data/airports/`, restores the current UTC day's guesses from browser `localStorage`, and picks the airport of the day deterministically from the generated pool.
4. For `Cardle`, the browser loads the committed Skycards reference snapshots, derives a guessable aircraft-model pool from `models.json`, restores the current UTC day's guesses from browser `localStorage`, and picks the model of the day deterministically from that reference pool.
5. The user can alternatively upload a Skycards export JSON file or use the landing-page `View Example Dashboard` button to load a built-in sample deck.
6. During localhost preview started through `scripts/serve_local_preview.py`, the browser can also auto-load the repo-root `skycards_user.json` fixture with `?devLoad=skycards_user`; that path exists only for local real-data validation and should be used instead of the example deck when testing live/completionist behavior.
7. Maintainers can refresh that repo-root fixture locally with `scripts/export_skycards_user.py`, which reads credentials from the gitignored `.env.skycards.local` file, calls the Skycards login endpoint, and writes the full `response.userData` payload only to local ignored files.
8. The active uploaded export is cached in browser `sessionStorage` so refreshes in the current browser session can restore the same dashboard state, including upload-scoped completionist hidden-airport and hidden-aircraft choices.
9. Optional: if the user enables local persistence, the active uploaded export is also cached in browser storage on that device (IndexedDB first, with legacy `localStorage` migration) and can be restored on a later visit.
10. The browser validates the payload shape and loads static reference snapshots (`models.json`, `airports.json`, and any optional datasets listed in `manifest.json`).
11. Aircraft cards are enriched by `card.modelId -> models.rows[].id`.
12. Airport unlocks are enriched by `unlockedAirportIds[] -> airports.rows[].id`.
13. The app computes tab-specific view models in memory:
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
  - completionist-mode flight matches built by comparing the shared delayed snapshot from the production Cloudflare source selected in `site/data/runtime-config.json` (or the local `site/data/live/` fixture path on localhost) against the current user's missing airport unlocks and missing aircraft models entirely in-browser after discarding live rows without usable registrations, with compact `Missing airport` / `New card` target toggles enabled by default, a separate live sort control for busiest airport/card groups vs latest sightings, a shared live-refresh status block (`Last updated ... ago.` plus `Next update expected in ...`) that now matches the daily-missions page, browser-local desktop header sliders on the live map that can override the default map framing while first consuming available outer page gutter before squeezing the adjacent panel, completionist summary/pill counts tracking unique airport and card targets instead of duplicate flight rows, map rerenders preserving the current viewport unless the user explicitly triggers a focus/reset action, and `Hide airport` / `Hide aircraft` dismissals serialized into the active upload so they persist across refresh in the current browser session and across later sessions when local save is enabled until a different file is uploaded
14. The loaded UI transitions to a tabbed dashboard (`Navdle`, `Cardle`, `Map`, and `Deck`) without sending upload data to any server. The two daily tabs remain available even when no collection upload is active.
15. Separately, the standalone `/daily-missions/` route reads the shared daily-missions manifest directly in-browser, checks that manifest on a short client cadence, only fetches a new snapshot when the published version changes, opens in `All missions` mode by default, gives the map the dominant viewport inside a desktop workspace whose map/rail width and total map height can be overridden with browser-local header sliders, uses available outer page gutter before shrinking the rail when that map is expanded on wide screens, lifts the mission filters into a compact command header above the map, keeps the dense right rail (finder values first, then controls, highlighted flight, and live matches) synchronized as the browser refreshes the board, preserves the current map viewport across background refreshes, renders live flights as heading-aware aircraft silhouette markers without collapsing them into numbered circles, pins the selected-flight telemetry callout directly to the chosen aircraft with an inline FR24 link, uses the same two-line live-refresh status copy as completionist mode so both shared-data surfaces describe recency and next-check timing the same way, and can optionally load a local `skycards_user.json` export in-browser so `completedAirportIds` resolve against the committed airport reference and draw the same blue `100 km` / `200 km` coverage radii used by completionist mode.

## Completionist live snapshot contract

Completionist mode does not fetch its upstream live-flight feed directly from the browser.

- production completionist reads are selected from `site/data/runtime-config.json`, which now keeps both an `activeSource` and a `shadowSource`
- the active source now points at the fr24-derived completionist manifest produced by `fr24-discord-bot`
- the shadow source points at the legacy Skyviz-owned `workers/completionist-live/` pipeline for rollback and burn-in parity
- the browser still reads only one manifest at a time; shadow parity is handled by explicit runtime-config selection or repo scripts, not by dual-fetching in the main UI
- the Skyviz-owned `workers/completionist-live/` pipeline remains available only as the legacy shadow producer during burn-in and rollback
- a Worker `Cron Trigger` fires every `5` minutes and starts one `Workflow` run for that schedule slot
- the workflow seeds world tiles onto a `Queue`; queue consumers fetch the upstream live-flight feed by bounds, normalize rows, and write per-tile artifacts to `R2`
- a `Durable Object` coordinator owns tile leases, retry-safe counters, split decisions, budget exhaustion, and single-writer publish readiness
- capped tiles split recursively until they fall below the cap, hit the minimum tile size, or exhaust the per-run request budget
- finalized rows are merged and deduped by `flightId` before publish because adjacent tiles overlap and aircraft move while the sweep is in flight
- published artifacts are written to versioned `R2` keys, and the stable manifest key is updated last so the browser's `manifest -> snapshot` fetch stays consistent
- per-tile `R2` artifacts are deleted after a successful publish, and versioned run artifacts are pruned on a short retention window so the bucket does not accumulate unnecessary storage bloat
- the browser resolves the production manifest URL from the runtime-config `activeSource`, unless query-string overrides force `completionistSource=active`, `completionistSource=shadow`, or one explicit `completionistManifestUrl`
- the browser resolves manifest-provided snapshot paths against the selected manifest URL first, including leading-slash artifact paths such as `/artifacts/...`, so cross-origin shared-data manifests keep loading from the producer origin instead of the GitHub Pages site origin
- the browser now polls the selected completionist manifest every `15` seconds and only downloads the full snapshot when the manifest version changes, so the map can follow new shared publishes without re-downloading the same payload on a fixed minute timer
- as of `2026-03-24`, `activeSource` should point at `fr24Shared`; producer-side dual-source unification closed the meaningful user-visible parity gap, and the deciding fixture check showed `705` legacy displayable targets vs `712` fr24-shared displayable targets with `701` overlapping
- when served from `localhost`, `127.0.0.1`, or `file:`, the browser ignores the production endpoint and prefers `site/data/live/completionist-manifest.json` unless one of those explicit completionist query-string overrides is present
- `scripts/refresh_completionist_snapshot.py` still runs the same adaptive tiled sweep locally and writes `site/data/live/completionist-manifest.json` plus `site/data/live/completionist-snapshot.json` for preview and offline validation
- `scripts/compare_completionist_sources.py` compares the runtime-config active and shadow sources for parity during burn-in and rollback review
- the repository requires `python scripts/check_cloudflare_account.py` before any Cloudflare write operation; that guardrail verifies Wrangler auth is on `seansailer28@gmail.com` / `172da47da00e3b33810d2e9c73c9a0b9`
- the snapshot payload keeps only the fields needed for matching and map rendering: flight id, aircraft hex, coordinates, heading, altitude, speed, type code, registration, seen time, origin, destination, flight number, and callsign
- snapshot metadata keeps only the browser-facing refresh contract: generated time, row count, field order, and refresh cadence

## Daily missions live artifact contract

The standalone `/daily-missions/` route consumes the canonical shared artifact produced by `fr24-discord-bot`.

- production daily-missions reads are configured in `site/data/runtime-config.json`
- the browser supports `?dailyMissionsManifestUrl=<absolute-url>` to force one explicit manifest URL for local debugging
- during localhost preview, the browser tries `site/data/live/daily-missions-manifest.json` first and falls back to the shared live manifest when that optional fixture does not exist
- the browser does not parse raw mission text or reconstruct matching logic; it renders the published mission metadata, finder sections, and denormalized matching flights directly
- the manifest contract exposes the stable browser-facing fields: `artifactFamily`, `schemaVersion`, `generatedAt`, `missionDate`, `publishIntervalSeconds`, `staleAfterSeconds`, `missionCount`, `rowCount`, and `snapshotPath`
- the snapshot contract exposes `missions[]` with mission titles/counts/finder sections and `flights[]` with live coordinates, `track`, route summary, speed, altitude, FR24 URL, and `matchedMissionKeys[]`
- the browser now polls the selected daily-missions manifest every `15` seconds and only downloads the board snapshot when the published version changes, so the page can track new shared daily-board publishes without re-fetching the same board payload every minute
- the standalone page defaults to `All missions`, supports pinning one mission lane at a time, and uses query-string state (`?date=` and `?mission=`) only as browser-side selection hints
- the standalone page also supports an optional browser-local `skycards_user.json` upload, resolves `completedAirportIds` against the committed `airports.json` snapshot, and overlays translucent blue `100 km` plus `200 km` circles so the mission map can be read against the user's weekly travel radii without sending that file to any server

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
- Completionist mode reads a delayed shared flight snapshot from Cloudflare in production, or from local fixtures during preview, but it still matches that snapshot against the user's collection locally in-browser.
- The standalone daily-missions page can optionally read a local `skycards_user.json` upload to draw weekly airport radii, and that upload also stays local to the browser.
- Localhost preview may expose the repo-root `skycards_user.json` fixture through `scripts/serve_local_preview.py` so browser automation can validate real collection behavior without falling back to the built-in example deck.
- `scripts/serve_local_preview.py` now self-probes the advertised loopback URLs before reporting success, so maintainers do not get a false "server is running" state when another local listener is hijacking part of the same port.
- `scripts/export_skycards_user.py` is a maintainer-only local workflow tool; it reads the gitignored `.env.skycards.local` config, writes only ignored local files, and is not part of the deployed GitHub Pages runtime.
- Cardle's hotspot hint is the only direct browser fetch to an external gameplay API, and it happens only after the in-game unlock threshold is reached.
- There is no authentication, persistence layer, or custom backend.

## Primary repository surfaces

- `site/index.html`: layout shell and upload affordances.
- `site/daily-missions/index.html`: standalone mission-board shell and metadata.
- `site/src/main.js`: file loading, status banners, tab state, Leaflet map orchestration, and virtualized aircraft list rendering.
- `site/src/daily-missions-main.js`: standalone mission-board fetch, filtering, Leaflet map rendering, and list synchronization.
- `site/src/daily.js`: airport daily-game selection, search, comparison, hint, and streak helpers.
- `site/src/cardle.js`: aircraft daily-game selection, search, comparison, hotspot, and share helpers.
- `site/src/data.js`: validation, normalization, enrichment, and tab-specific dashboard model building.
- `site/src/continents.js`: country-to-continent mapping used for airport continent progress.
- `site/src/charts.js`: stacked ribbons, bars, scatter plots, and geo-style plots.
- `site/data/airports/`: generated OurAirports CSV snapshots plus the derived airport daily manifest and dataset.
- `site/data/runtime-config.json`: production completionist source selection and manifest endpoints.
- `site/data/live/`: local completionist fixture snapshot and manifest.
- `scripts/serve_local_preview.py`: serves `site/` plus the repo-root `skycards_user.json` fixture for localhost validation.
- `scripts/export_skycards_user.py`: refreshes the repo-root `skycards_user.json` fixture and a local archive by writing the full `response.userData` payload from the Skycards login endpoint.
- `site/tools/aircraft-db-explorer.html`: local SQLite database explorer UI.
- `site/tools/inferred-mapping-reviewer.html`: local review UI for inferred mapping decisions.
- `site/data/reference/`: committed reference snapshots and manifest.
- `scripts/refresh_reference_data.py`: official snapshot refresh path.
- `scripts/refresh_airport_game_data.py`: refreshes OurAirports source CSVs and rebuilds the daily-game dataset.
- `scripts/refresh_completionist_snapshot.py`: fetches and reduces the completionist-mode live flight snapshot for local fixture generation.
- `scripts/check_cloudflare_account.py`: verifies Wrangler auth and the locked Cloudflare account before write operations.
- `scripts/refresh_model_registration_counts.py`: refreshes per-model total registration counts.
- `scripts/build_aircraft_lookup_from_db.py`: builds `aircraftId` to model lookup from SQLite data.
- `scripts/build_inferred_aircraft_mappings.py`: generates inferred type-code artifacts and manual-review queues for unresolved rows.
- `scripts/build_resolved_aircraft_lookup.py`: merges high-confidence inferred rows into a consumable lookup snapshot.
