# Agentic Workflows

This repository is meant to be maintained by agents and humans using the same repo surfaces, not by relying on chat-only context.

## Working model

- `AGENTS.md` is the concise context injector.
- `docs/` is the system of record for durable knowledge.
- `skills/public/` contains reusable repo-local workflows.
- `scripts/` contains low-risk maintenance and validation tooling.
- `site/` is the product runtime that GitHub Pages deploys directly.

## Standard execution loop

1. Read `docs/index.md` and the relevant architecture or workflow docs.
2. Use the closest repo-local skill when one applies.
3. Before starting any local preview server, browser harness, or other long-running dev process, check whether the target port is already in use and avoid stacking a new listener onto an occupied port. For the standard browser-validation port `4173`, explicitly check for an existing Python-backed server first; if one is already serving there, reuse it instead of starting another server and leave that existing process running when the task ends.
4. Make the smallest coherent change that satisfies the task.
5. Before any Cloudflare write operation, run `python scripts/check_cloudflare_account.py` and confirm Wrangler is on `seansailer28@gmail.com` / `172da47da00e3b33810d2e9c73c9a0b9`.
6. Update docs, scripts, and workflow artifacts in the same pass when behavior changes.
7. Run the offline checks and report any live validation that was not possible.
8. Clean up any long-running local servers or browser automation processes started for the task unless the user explicitly asks to keep them running.
9. Record durable architectural or workflow decisions in `docs/decisions/` when the reasoning will matter later.

## Visual bug validation

- Reproduce the bug in Playwright before changing code.
- Re-run the same Playwright flow after edits to confirm the fix.
- In Codex desktop sessions where the built-in Playwright browser tools are available, prefer those tools first for browser validation because they avoid the terminal CLI startup overhead.
- In Codex sessions where `js_repl` is available, prefer `js_repl` for persistent iterative browser checks or Playwright-driven QA loops once the initial browser session is established.
- Start local browser validation by first checking whether a Python server is already serving on port `4173`. Reuse that existing `4173` server when present; only start `python scripts/serve_local_preview.py` yourself when no reusable `4173` Python server exists.
- The preferred shared `4173` server for this repo is `python scripts/serve_local_preview.py`, because it exposes the repo-root `skycards_user.json` helper flow at `?devLoad=skycards_user` in addition to serving `site/`.
- When reusing an existing `4173` server, inspect what command started it. If it is a generic static server such as `python -m http.server`, do not assume repo helper routes like `?devLoad=skycards_user` exist; use manual upload instead of wasting time on helper-path retries. If the user explicitly asks to improve or normalize the shared preview environment, replace that generic shared server with `python scripts/serve_local_preview.py` on `4173`.
- If `serve_local_preview.py` exits immediately with a reachability-check failure, free the conflicting local listener on that port or rerun with `--port` before attempting browser validation.
- When a real collection is needed for UI validation, use the repo-root `skycards_user.json` fixture (`http://localhost:4173/?devLoad=skycards_user` or manual upload) and do not use the built-in example deck.
- If that repo-root fixture is missing or stale, refresh it locally with `python scripts/export_skycards_user.py` using the gitignored `.env.skycards.local` file instead of pasting credentials into chat or shell history.
- Reuse one named Playwright session for the whole task instead of reopening the browser between checks. Close that session only when the task is actually finished.
- If terminal browser work is still needed, use the global `playwright-cli` binary when available and treat `npx ... @playwright/cli` as a last resort only. The global binary avoids the repeated package-bootstrap overhead that otherwise adds roughly a second to every CLI call.
- For scripted multi-step verification on known selectors, prefer one `playwright-cli run-code --filename output/playwright/<label>.js` flow over many separate `snapshot` / `click` / `fill` CLI calls. Reserve repeated snapshots for exploratory DOM discovery or when refs genuinely need to be rediscovered.
- Capture Playwright evidence (snapshot and/or screenshot) when possible.
- If Playwright cannot run, state that limitation explicitly and do not claim browser confirmation.

## What agents should produce

Agents may update any repository artifact that helps the product ship and stay maintainable:

- Static site code in `site/`
- Maintenance tooling in `scripts/`
- GitHub Actions workflows in `.github/workflows/`
- Durable docs in `docs/`
- Repo-local skills in `skills/public/`

If a task touches multiple layers, update those layers together instead of leaving follow-through to chat.

## When the repository is the problem

Repeated agent confusion is repository feedback. When work is harder than it should be, prefer fixing the repo by adding:

- Clearer docs
- Stronger skills or references
- Lightweight validation scripts
- CI checks
- Durable decision records

The goal is to reduce repeated ambiguity and entropy over time.

## Process ownership

- Reuse an existing Python server on port `4173` when one is already present instead of launching a second preview server.
- Only stop local preview servers or browser helpers that were started for the current task.
- Leave pre-existing user or repo processes running unless the user explicitly asks for them to be changed.
