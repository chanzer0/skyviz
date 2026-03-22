# Repo Hygiene

This repository should accumulate capability, not ambiguity.

## Entropy signals

Treat these as cleanup triggers:

- `AGENTS.md` starts collecting detailed procedures instead of links.
- The same chat explanation is needed across multiple tasks.
- Docs drift from the static app or refresh tooling.
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

- `scripts/repo_hygiene_check.py` verifies the core workflow files exist, with a reduced `--mode completionist-only` path for snapshot-only Pages runs that intentionally skip gitignored generated reference artifacts.
- `scripts/smoke_check.py` runs the hygiene check and validates the known data artifacts. Its default `full` mode covers the reference and airport datasets, while `--mode completionist-only` is the scheduled Pages validation path for completionist snapshot republishes.
- CI should run the smoke check so workflow drift is visible before merge.
