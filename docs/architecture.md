# Architecture

## Components

- Static application shell in `site/index.html`.
- Visual system and responsive layout in `site/styles.css`.
- Browser runtime in `site/src/main.js`.
- Collection parsing, enrichment, and derived metrics in `site/src/data.js`.
- Continent lookup map in `site/src/continents.js`.
- SVG and HTML chart helpers in `site/src/charts.js`.
- Built-in example collection deck in `site/data/example/try_now_user.json`.
- CDN route reference artifact in repo root `cdn_index.json` for debugging/validating `https://cdn.skycards.oldapes.com/assets` path coverage.
- Leaflet runtime assets loaded from CDN in `site/index.html` for the interactive airport map.
- Reference snapshot refresh tooling in `scripts/refresh_reference_data.py`.
- Offline repo validation in `scripts/repo_hygiene_check.py` and `scripts/smoke_check.py`.
- GitHub Pages deployment in `.github/workflows/deploy-pages.yml`.

## Data flow

1. A user opens the static site from GitHub Pages.
2. The user either uploads a Skycards export JSON file or uses the landing-page `View Example Dashboard` button to load a built-in sample deck.
3. Optional: if the user enables local persistence, the active deck is cached in browser `localStorage` on that device and can be restored on next visit.
4. The browser validates the payload shape and loads static `models.json` and `airports.json` reference snapshots.
5. Aircraft cards are enriched by `card.modelId -> models.rows[].id`.
6. Airport unlocks are enriched by `unlockedAirportIds[] -> airports.rows[].id`.
7. The app computes two loaded-state view models in memory:
   - airport capture progress across all committed reference airports
   - aircraft analytics, progress widgets, and a virtualized aircraft card deck
   - aircraft image candidates resolved as tier-aware CDN URLs using `*_md.png` first, then `cyber` tier + model metadata alias fallback (`imageOverride`, `images[]`)
8. The loaded UI transitions to a tabbed dashboard (`Map` and `Aircraft`) without sending upload data to any server.

## Reference data contract

Skycards reference data is fetched from:

- `GET https://api.skycards.oldapes.com/models`
- `GET https://api.skycards.oldapes.com/airports`

Required request headers:

- `Accept: application/json`
- `x-client-version: 2.0.24`

The reference snapshots keep the site self-contained for GitHub Pages and make agent work deterministic. The refresh script writes a `manifest.json` file that records the base URL, client version, update timestamps, and row counts.

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
- `site/data/reference/`: committed reference snapshots and manifest.
- `scripts/refresh_reference_data.py`: official snapshot refresh path.
