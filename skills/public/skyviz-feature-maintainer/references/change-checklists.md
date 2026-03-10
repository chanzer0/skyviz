# Change Checklists

## Dashboard UI change

- Update the relevant files in `site/`.
- Update `README.md` if usage or local preview expectations changed.
- Run `python scripts/smoke_check.py`.
- For visual bug fixes, reproduce the bug with Playwright before edits and confirm the fix with Playwright after edits.
- Use a browser pass when the environment supports it.

## Daily game change

- Update the relevant files in `site/`.
- Update `README.md` and `docs/architecture.md`.
- If the work adds or changes a durable runtime surface, update the repo-local skill references.
- Run `python scripts/smoke_check.py`.
- Use a browser pass when the environment supports it.

## Reference data contract change

- Update `scripts/refresh_reference_data.py`.
- Update `site/src/data.js`.
- Update `docs/architecture.md` and `README.md` if the workflow changed.
- Rebuild or refresh `site/data/reference/manifest.json` if needed.

## Airport daily game or OurAirports data change

- Update the relevant files in `site/`.
- Update `scripts/refresh_airport_game_data.py`.
- Update `README.md` and `docs/architecture.md`.
- Run `python scripts/smoke_check.py`.
- Use a browser pass when the environment supports it.

## Workflow or architecture change

- Update the relevant `docs/` surfaces.
- Update `AGENTS.md` if the routing map changed.
- Update the repo-local skill when the standard execution path changed.
- Run `python scripts/repo_hygiene_check.py`.
