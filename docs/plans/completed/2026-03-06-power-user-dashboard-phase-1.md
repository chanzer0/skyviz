# 2026-03-06 Power-User Dashboard Phase 1

## Goal

Replace the post-upload long-scroll report with a tabbed, mobile-first dashboard centered on two power-user workflows:

- airport unlock progress
- aircraft inventory and progress analysis

## Delivered

- Loaded-state shell refactor in `site/index.html`:
  - tabbed navigation (`Map`, `Aircraft`)
  - map panel with side progress widgets
  - aircraft analytics panels plus a virtualized expandable list
- Runtime refactor in `site/src/main.js`:
  - tab state management
  - Leaflet map integration and marker rendering from committed airport lat/lon
  - map legend and airport progress widgets
  - aircraft search/sort controls and virtualized list rendering with row expansion
- Data model refactor in `site/src/data.js`:
  - full-airport reference coverage model with captured/missing state
  - country and continent completion series
  - aircraft aggregate rows and progress series by tier/category/type
  - placeholder signals for image and unique-registration per-aircraft fields
- Continent mapping layer in `site/src/continents.js`.
- Visual system overhaul in `site/styles.css` for the tabbed dashboard and mobile-first layout.
- README and architecture updates for the new workflow.

## Placeholder decisions

- Per-aircraft unique registration counts are intentionally placeholders pending an authoritative `aircraftId -> modelId` join.
- Aircraft images are intentionally placeholders pending an official image URL resolver.

## Validation

- `node --check site/src/continents.js`
- `node --check site/src/data.js`
- `node --check site/src/main.js`
- `node --check site/src/charts.js`
- `python scripts/smoke_check.py`
- `python scripts/repo_hygiene_check.py`
- Playwright browser pass:
  - desktop and mobile
  - upload flow
  - tab switching
  - Leaflet map rendering
  - aircraft list expansion/search/sort
