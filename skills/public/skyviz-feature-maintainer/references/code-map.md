# Code Map

Read `docs/index.md` first when you need the current system-of-record doc map.

## Runtime entry points

- `site/index.html`: application shell, upload affordances, and section containers.
- `site/styles.css`: design system, responsive layout, and animations.
- `site/src/main.js`: runtime boot, file handling, and rendering flow.

## Data and enrichment

- `site/src/data.js`: payload validation, enrichment, aggregation, and dashboard model creation.
- `site/data/reference/`: committed Skycards reference snapshots and manifest.
- `scripts/refresh_reference_data.py`: official reference refresh path.

## Presentation

- `site/src/charts.js`: reusable SVG and HTML chart generators.
- `site/src/format.js`: formatting and label helpers.
- `site/assets/`: static visual assets.

## Docs to keep aligned

- `README.md`: local preview, refresh workflow, and deployment summary.
- `docs/architecture.md`: system-level behavior.
- `docs/golden-principles.md`: invariants and follow-through.
- `docs/repo-hygiene.md`: entropy-control rules.
