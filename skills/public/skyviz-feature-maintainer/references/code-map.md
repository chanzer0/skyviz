# Code Map

Read `docs/index.md` first when you need the current system-of-record doc map.

## Runtime entry points

- `site/index.html`: application shell, upload affordances, and section containers.
- `site/styles.css`: design system, responsive layout, and animations.
- `site/src/main.js`: runtime boot, file handling, and rendering flow.
- `site/src/daily.js`: airport daily-game target selection, hint logic, and comparison helpers.
- `site/src/cardle.js`: aircraft daily-game target selection, stat comparison, hotspot helpers, and share helpers.

## Data and enrichment

- `site/src/data.js`: payload validation, enrichment, aggregation, and dashboard model creation.
- `site/data/reference/`: committed Skycards reference snapshots and manifest.
- `site/data/airports/`: generated OurAirports CSV snapshots plus the Navdle daily manifest and dataset.
- `scripts/refresh_reference_data.py`: official reference refresh path.
- `scripts/refresh_airport_game_data.py`: official OurAirports refresh/build path for the Navdle airport game.

## Presentation

- `site/src/charts.js`: reusable SVG and HTML chart generators.
- `site/src/format.js`: formatting and label helpers.
- `site/assets/`: static visual assets.

## Docs to keep aligned

- `README.md`: local preview, refresh workflow, and deployment summary.
- `docs/architecture.md`: system-level behavior.
- `docs/golden-principles.md`: invariants and follow-through.
- `docs/repo-hygiene.md`: entropy-control rules.
