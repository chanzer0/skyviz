# Repo Hygiene

This repository should accumulate capability, not ambiguity.

## Entropy signals

Treat these as cleanup triggers:

- `AGENTS.md` starts collecting detailed procedures instead of links.
- The same chat explanation is needed across multiple tasks.
- Docs drift from the static app or refresh tooling.
- Cloudflare account targeting has to be re-explained because guardrails are missing or ignored.
- Repo-local skills point to stale files or missing follow-through steps.
- Temporary plans linger after the work is done.

## Required cleanup actions

When those signals appear, prefer repository fixes such as:

- Move durable detail out of `AGENTS.md` into `docs/`
- Add or strengthen a repo-local skill or reference file
- Add a low-risk script for a repeated failure mode
- Update docs in the same change as the behavior change
- Record a durable decision when the reasoning will matter later

## Lightweight enforcement

- `scripts/repo_hygiene_check.py` verifies the core workflow files exist, including the Cloudflare completionist runtime and account-check guardrail.
- `scripts/serve_local_preview.py` is the standard localhost preview path so real-data browser validation can use the repo-root `skycards_user.json` fixture instead of drifting to the example deck.
- `scripts/smoke_check.py` runs the hygiene check and validates the known data artifacts, including the repo-root `skycards_user.json` fixture, the production completionist runtime-config, and the locked Cloudflare account id in Wrangler config.
- `scripts/check_cloudflare_account.py` is the required preflight before any Cloudflare write command.
- CI should run the smoke check so workflow drift is visible before merge.
