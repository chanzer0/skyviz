# 2026-03-06 Static Agentic Foundation

## Status

Accepted

## Context

Skyviz is a brand-new repository with two primary constraints:

- The product should ship as a GitHub Pages site.
- The repository should support an agent-heavy implementation and maintenance model inspired by the harness engineering guidance.

The working Skycards reference contract already exists in `D:\Repositoriesr24-discord-bot`, including the required `x-client-version` header and the stable `models` and `airports` payload structure.

## Decision

Use a no-backend static architecture:

- Static site source lives in `site/`.
- User collection uploads are processed entirely in the browser.
- Skycards reference data is committed in `site/data/reference/` and refreshed by `scripts/refresh_reference_data.py`.
- Durable repository knowledge lives in `docs/`, with a concise `AGENTS.md` and repo-local skill scaffolding.

## Consequences

- The dashboard can be deployed directly to GitHub Pages without runtime infrastructure.
- Reference data stays deterministic for local development and agent work.
- The repository remains simple to navigate and operate without a package-manager bootstrap.
- If the site eventually outgrows the no-build approach, that should be captured in a new decision record rather than introduced implicitly.
