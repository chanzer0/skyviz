# Golden Principles

These are the repository invariants and follow-through rules that should survive individual tasks.

## Product invariants

- Keep collection uploads browser-local unless the task explicitly changes the product model.
- Keep the application statically deployable to GitHub Pages.
- Prefer committed Skycards reference snapshots plus the official refresh script over ad hoc data copies.
- Keep completionist production refreshes on Cloudflare, but keep local fixture generation under `site/data/live/`.
- Any Cloudflare operation in this repository must target `seansailer28@gmail.com` / `172da47da00e3b33810d2e9c73c9a0b9`.
- Treat the example user export as a development artifact, not workflow documentation.

## Follow-through rules

- User-visible dashboard changes update the site code and `README.md` when setup or usage changes.
- Reference data changes update both `scripts/refresh_reference_data.py` and the consuming browser logic in `site/src/data.js`.
- Architecture or workflow changes update `docs/index.md` and the relevant durable docs.
- Repeated review comments or repeated agent mistakes should usually result in a script, checklist, skill, or doc update.

## Validation rules

- Prefer `python scripts/smoke_check.py` for the default offline validation pass.
- Use `python scripts/repo_hygiene_check.py` to verify the repo scaffolding is intact.
- For local real-data browser validation, first check whether a Python server is already serving on port `4173`; reuse that server when present and do not shut it down afterward. Only start `python scripts/serve_local_preview.py` yourself when no reusable Python server is already on `4173`, then use the repo-root `skycards_user.json` fixture (`?devLoad=skycards_user` or manual upload). Do not use `View Example Dashboard` for real-data validation.
- The preferred long-lived shared server on `4173` is `python scripts/serve_local_preview.py`, because real-data validation is faster and more deterministic when `?devLoad=skycards_user` is available without a manual upload step.
- If the reused `4173` server is not `scripts/serve_local_preview.py`, do not assume repo-only helper routes exist. Prefer manual upload immediately rather than spending browser time proving a generic static server cannot serve the repo-root fixture helper path.
- For visual bug fixes, reproduce the issue with Playwright before edits and confirm the fix with Playwright after edits.
- In Codex desktop sessions, prefer the built-in Playwright browser tools first when they are available. They now provide the fastest default browser-validation path in this repo.
- In Codex sessions where `js_repl` is available, prefer it for persistent interactive UI-debug loops or repeated browser-side assertions after the initial browser session is running.
- Keep one named Playwright session alive for the duration of a UI-debug task when possible. Prefer one scripted `run-code --filename` validation pass over many tiny CLI round trips once the target selectors and assertions are known.
- If terminal Playwright work is needed, prefer the global `playwright-cli` binary over `npx`; treat the `npx` form as fallback-only.
- Only claim live Skycards fetches or browser validation when those flows were actually exercised.
- If Playwright could not run, say so explicitly and do not claim visual bug confirmation.
- Leave local processes as you found them: do not stop an existing `4173` Python server you did not start for the current task.

## Documentation rules

- Keep `AGENTS.md` routing-focused.
- Keep durable knowledge in `docs/`, not only in chat.
- Use `docs/decisions/` for design history that future work will need.
- Use `docs/plans/` when a multi-step execution trail is useful for future maintainers.
