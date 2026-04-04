# Change Checklists

## Dashboard UI change

- Update the relevant files in `site/`.
- Update `README.md` if usage or local preview expectations changed.
- Run `python scripts/smoke_check.py`.
- Before starting local preview or other long-running local tooling, check whether the intended port is already occupied.
- For the standard browser-validation port `4173`, first look for an existing Python server and reuse it when present instead of starting a new preview server.
- The preferred shared `4173` server is `python scripts/serve_local_preview.py` so `?devLoad=skycards_user` stays available for real-data validation.
- When real browser data matters, use that existing `4173` Python server if one is already running; otherwise start `python scripts/serve_local_preview.py` yourself and validate with the repo-root `skycards_user.json` fixture (`?devLoad=skycards_user` or manual upload). Do not use the built-in example deck.
- If the reused `4173` server is a generic static server rather than `scripts/serve_local_preview.py`, skip `?devLoad=skycards_user` and use manual upload immediately.
- If the user explicitly asks to normalize or improve the shared browser-validation environment, replace that generic shared `4173` server with `python scripts/serve_local_preview.py`.
- If the preview script exits with a reachability-check failure, stop the conflicting local listener or rerun with `--port` before opening the browser.
- If that fixture is missing or stale, refresh it locally with `python scripts/export_skycards_user.py` before the browser pass.
- For visual bug fixes, reproduce the bug with Playwright before edits and confirm the fix with Playwright after edits.
- In Codex desktop sessions, prefer the built-in Playwright browser tools first when they are available.
- When `js_repl` is available, prefer it for persistent iterative UI checks or repeated browser-side assertions after the browser session is established.
- If terminal browser work is needed, prefer the global `playwright-cli` binary and treat the `npx` form as fallback-only.
- Reuse one named Playwright session across the task, and once selectors are known prefer one `run-code --filename` script over many separate CLI calls so `npx` startup overhead does not dominate the browser pass.
- Use a browser pass when the environment supports it.
- Clean up any local preview or automation processes you started once validation is complete unless the user asked to keep them running, and leave any pre-existing `4173` Python server alone.

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
- If Cloudflare is involved, verify `python scripts/check_cloudflare_account.py` before any write command and keep the account lock docs in sync.
- Run `python scripts/repo_hygiene_check.py`.
