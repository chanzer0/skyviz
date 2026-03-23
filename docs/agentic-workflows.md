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
3. Make the smallest coherent change that satisfies the task.
4. Before any Cloudflare write operation, run `python scripts/check_cloudflare_account.py` and confirm Wrangler is on `seansailer28@gmail.com` / `172da47da00e3b33810d2e9c73c9a0b9`.
5. Update docs, scripts, and workflow artifacts in the same pass when behavior changes.
6. Run the offline checks and report any live validation that was not possible.
7. Record durable architectural or workflow decisions in `docs/decisions/` when the reasoning will matter later.

## Visual bug validation

- Reproduce the bug in Playwright before changing code.
- Re-run the same Playwright flow after edits to confirm the fix.
- Start local browser validation with `python scripts/serve_local_preview.py`.
- When a real collection is needed for UI validation, use the repo-root `skycards_user.json` fixture (`http://localhost:4173/?devLoad=skycards_user` or manual upload) and do not use the built-in example deck.
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
