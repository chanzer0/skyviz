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
- For local real-data browser validation, start `python scripts/serve_local_preview.py` and use the repo-root `skycards_user.json` fixture (`?devLoad=skycards_user` or manual upload). Do not use `View Example Dashboard` for real-data validation.
- For visual bug fixes, reproduce the issue with Playwright before edits and confirm the fix with Playwright after edits.
- Only claim live Skycards fetches or browser validation when those flows were actually exercised.
- If Playwright could not run, say so explicitly and do not claim visual bug confirmation.

## Documentation rules

- Keep `AGENTS.md` routing-focused.
- Keep durable knowledge in `docs/`, not only in chat.
- Use `docs/decisions/` for design history that future work will need.
- Use `docs/plans/` when a multi-step execution trail is useful for future maintainers.
