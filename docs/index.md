# Docs Index

This directory is the system of record for durable repository knowledge.

## Read order

1. `README.md` for quickstart and high-level behavior.
2. `docs/architecture.md` for the runtime shape and data flow.
3. `docs/golden-principles.md` for invariants and follow-through.
4. `docs/agentic-workflows.md` for how agents should operate here.
5. `docs/repo-hygiene.md` for entropy control and cleanup expectations.

## Durable surfaces

- `docs/architecture.md`: static app design, enrichment flow, and deployment shape.
- `docs/agentic-workflows.md`: repository operating model for agents.
- `docs/golden-principles.md`: cross-cutting rules that should survive individual tasks.
- `docs/repo-hygiene.md`: cleanup triggers and workflow drift controls.
- `site/data/live/`: completionist-mode delayed live-flight snapshot artifacts published with the site.
- `.github/workflows/refresh-completionist-pages.yml`: lightweight Pages refresh path for completionist-only publishes.
- `workers/completionist-dispatch/`: Cloudflare cron dispatcher for completionist refreshes.
- `docs/decisions/`: cross-cutting design history.
- `docs/plans/`: active and completed work plans worth keeping.

## Update map

- App structure changes: update `docs/architecture.md`.
- Completionist snapshot pipeline or deployment-cadence changes: update `docs/architecture.md`, `README.md`, and any external scheduler config/docs.
- Workflow validation mode changes: update `docs/architecture.md`, `docs/repo-hygiene.md`, and `README.md`.
- Daily game changes (Navdle, Cardle, or the OurAirports pipeline): update `docs/architecture.md` and `README.md`.
- Process changes: update `docs/agentic-workflows.md`, `docs/golden-principles.md`, and `AGENTS.md`.
- New durable reasoning: add or update a decision record in `docs/decisions/`.
- Significant multi-step work: add or update a plan in `docs/plans/`.
