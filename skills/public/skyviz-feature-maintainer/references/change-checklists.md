# Change Checklists

## Dashboard UI change

- Update the relevant files in `site/`.
- Update `README.md` if usage or local preview expectations changed.
- Run `python scripts/smoke_check.py`.
- Use a browser pass when the environment supports it.

## Reference data contract change

- Update `scripts/refresh_reference_data.py`.
- Update `site/src/data.js`.
- Update `docs/architecture.md` and `README.md` if the workflow changed.
- Rebuild or refresh `site/data/reference/manifest.json` if needed.

## Workflow or architecture change

- Update the relevant `docs/` surfaces.
- Update `AGENTS.md` if the routing map changed.
- Update the repo-local skill when the standard execution path changed.
- Run `python scripts/repo_hygiene_check.py`.
