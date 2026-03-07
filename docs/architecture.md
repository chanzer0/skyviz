# Architecture

## Components

- Static application shell in `site/index.html`.
- Visual system and responsive layout in `site/styles.css`.
- Browser runtime in `site/src/main.js`.
- Collection parsing, enrichment, and derived metrics in `site/src/data.js`.
- Continent lookup map in `site/src/continents.js`.
- SVG and HTML chart helpers in `site/src/charts.js`.
- Built-in example collection deck in `site/data/example/try_now_user.json`.
- Local-only SQLite explorer in `site/tools/aircraft-db-explorer.html` for inspecting `aircraft_data.db` in-browser.
- Local-only inference reviewer in `site/tools/inferred-mapping-reviewer.html` for medium/ambiguous mapping triage.
- Optional inferred-mapping snapshot `site/data/reference/inferred_aircraft_type_mappings.json` for registration-confidence transparency in the aircraft deck.
- CDN route reference artifact in repo root `cdn_index.json` for debugging/validating `https://cdn.skycards.oldapes.com/assets` path coverage.
- Leaflet runtime assets loaded from CDN in `site/index.html` for the interactive airport map.
- Reference snapshot refresh tooling in `scripts/refresh_reference_data.py`.
- Model registration-count refresh tooling in `scripts/refresh_model_registration_counts.py`.
- Aircraft `aircraftId` lookup builder in `scripts/build_aircraft_lookup_from_db.py` (from local `aircraft_data.db`).
- Inference/review pipeline for unresolved registration rows in `scripts/build_inferred_aircraft_mappings.py`.
- Resolved-lookup merge pipeline in `scripts/build_resolved_aircraft_lookup.py`.
- Offline repo validation in `scripts/repo_hygiene_check.py` and `scripts/smoke_check.py`.
- GitHub Pages deployment in `.github/workflows/deploy-pages.yml`.

## Data flow

1. A user opens the static site from GitHub Pages.
2. The user either uploads a Skycards export JSON file or uses the landing-page `View Example Dashboard` button to load a built-in sample deck.
3. Optional: if the user enables local persistence, the active deck is cached in browser `localStorage` on that device and can be restored on next visit.
4. The browser validates the payload shape and loads static reference snapshots (`models.json`, `airports.json`, optional registration lookup/count datasets).
5. Aircraft cards are enriched by `card.modelId -> models.rows[].id`.
6. Airport unlocks are enriched by `unlockedAirportIds[] -> airports.rows[].id`.
7. The app computes two loaded-state view models in memory:
   - airport capture progress across all committed reference airports
   - aircraft analytics, progress widgets, and a virtualized aircraft card deck
   - per-model caught registration counts by decoding `uniqueRegs[].aircraftId` (decimal ICAO transponder) into hex and joining against the local aircraft lookup snapshot
   - per-registration mapping diagnostics (hex vs registration fallback, confidence class, ambiguity status, and optional inference hints) shown by the aircraft caution modal
   - per-model total possible registration counts from `/models/count/{icao}` snapshots
   - aircraft image candidates resolved as tier-aware CDN URLs using `*_md.png` first, then `cyber` tier + model metadata alias fallback (`imageOverride`, `images[]`)
8. The loaded UI transitions to a tabbed dashboard (`Map` and `Aircraft`) without sending upload data to any server.

## Reference data contract

Skycards reference data is fetched from:

- `GET https://api.skycards.oldapes.com/models`
- `GET https://api.skycards.oldapes.com/airports`
- `GET https://api.skycards.oldapes.com/models/count/{icao}`

Required request headers:

- `Accept: application/json`
- `x-client-version: 2.0.24`

The reference snapshots keep the site self-contained for GitHub Pages and make agent work deterministic:

- `scripts/refresh_reference_data.py` writes `models.json`, `airports.json`, and `manifest.json`.
- `scripts/refresh_model_registration_counts.py` writes `model_registration_counts.json`.
- `scripts/build_aircraft_lookup_from_db.py` writes `aircraft_lookup.json` from the local SQLite snapshot (`aircraft_data.db`).

## Browser-only product constraints

- The app stays static and deployable to GitHub Pages.
- User uploads are processed locally in the browser, with optional user-controlled `localStorage` persistence.
- Reference snapshots are committed artifacts so the site works without a runtime API dependency.
- There is no authentication, persistence layer, or custom backend.

## Primary repository surfaces

- `site/index.html`: layout shell and upload affordances.
- `site/src/main.js`: file loading, status banners, tab state, Leaflet map orchestration, and virtualized aircraft list rendering.
- `site/src/data.js`: validation, normalization, enrichment, and tab-specific dashboard model building.
- `site/src/continents.js`: country-to-continent mapping used for airport continent progress.
- `site/src/charts.js`: stacked ribbons, bars, scatter plots, and geo-style plots.
- `site/tools/aircraft-db-explorer.html`: local SQLite database explorer UI.
- `site/tools/inferred-mapping-reviewer.html`: local review UI for inferred mapping decisions.
- `site/data/reference/`: committed reference snapshots and manifest.
- `scripts/refresh_reference_data.py`: official snapshot refresh path.
- `scripts/refresh_model_registration_counts.py`: refreshes per-model total registration counts.
- `scripts/build_aircraft_lookup_from_db.py`: builds `aircraftId` to model lookup from SQLite data.
- `scripts/build_inferred_aircraft_mappings.py`: generates inferred type-code artifacts and manual-review queues for unresolved rows.
- `scripts/build_resolved_aircraft_lookup.py`: merges high-confidence inferred rows into a consumable lookup snapshot.
