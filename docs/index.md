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
- `site/data/runtime-config.json`: production completionist source selection plus active/shadow manifest endpoints.
- `site/daily-missions/`: standalone daily mission board route and page-specific styles.
- `site/data/live/`: local/offline completionist fixture artifacts.
- `scripts/serve_local_preview.py`: repo-aware localhost preview server for real-data browser validation with `skycards_user.json`.
- `scripts/export_skycards_user.py`: local-only fixture refresh tool that writes the full Skycards `userData` payload into the ignored repo-root `skycards_user.json`.
- `workers/completionist-live/`: legacy Skyviz-owned completionist producer kept for shadow-mode parity during the fr24 shared-data cutover.
- `scripts/check_cloudflare_account.py`: account-lock verification before Cloudflare write operations.
- `docs/decisions/`: cross-cutting design history.
- `docs/plans/`: active and completed work plans worth keeping.

## Update map

- App structure changes: update `docs/architecture.md`.
- Completionist pipeline, runtime-config, or Cloudflare deployment changes: update `docs/architecture.md`, `README.md`, and the account/deploy guardrails.
- Local preview or real-data validation workflow changes: update `README.md`, `docs/architecture.md`, `docs/agentic-workflows.md`, and the repo-local skill/checklists.
- Workflow validation mode changes: update `docs/architecture.md`, `docs/repo-hygiene.md`, and `README.md`.
- Daily feature changes (Navdle, Cardle, daily missions, or the OurAirports pipeline): update `docs/architecture.md` and `README.md`.
- Process changes: update `docs/agentic-workflows.md`, `docs/golden-principles.md`, and `AGENTS.md`.
- New durable reasoning: add or update a decision record in `docs/decisions/`.
- Significant multi-step work: add or update a plan in `docs/plans/`.
