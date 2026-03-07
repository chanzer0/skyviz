---
name: skyviz-feature-maintainer
description: Implement or extend the Skyviz static dashboard, reference-data flow, GitHub Pages deployment, or the docs and scripts that must stay aligned with those changes.
---

# Skyviz Feature Maintainer

## Overview

Use this skill for normal product and maintenance work in this repository. It keeps the static site, reference snapshots, refresh tooling, and durable docs aligned in the same change.

## Workflow

1. Read `docs/index.md` and `docs/architecture.md`.
2. Review `docs/golden-principles.md` before making cross-cutting changes.
3. Read [references/code-map.md](references/code-map.md) to find the runtime surface you are changing.
4. Use [references/change-checklists.md](references/change-checklists.md) for follow-through after you know the change type.
5. Make the smallest coherent change that keeps browser-local processing and GitHub Pages deployment intact unless the task explicitly changes those constraints.
6. Update docs, scripts, and workflow artifacts in the same pass when behavior changes.
7. Run the offline checks and report any live API or browser validation that was not possible.

## Default rules

- Keep user collection data in-browser unless the task explicitly introduces a backend.
- Keep reference enrichment compatible with `scripts/refresh_reference_data.py`.
- User-visible workflow changes update `README.md`.
- Architecture or durable workflow changes update `docs/`.
- Prefer adding repo-local guardrails over repeating the same chat explanation.

## Verification

- Default offline check: `python scripts/smoke_check.py`
- Repo workflow check: `python scripts/repo_hygiene_check.py`
- Use a browser pass when UI changes are meaningful and the environment supports it.

## References

- Read [references/code-map.md](references/code-map.md) first for file selection.
- Read [references/change-checklists.md](references/change-checklists.md) for follow-through rules.
