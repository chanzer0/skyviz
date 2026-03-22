from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = [
    'AGENTS.md',
    'README.md',
    'docs/index.md',
    'docs/architecture.md',
    'docs/agentic-workflows.md',
    'docs/golden-principles.md',
    'docs/repo-hygiene.md',
    'docs/decisions/README.md',
    'docs/plans/README.md',
    'skills/public/skyviz-feature-maintainer/SKILL.md',
    'skills/public/skyviz-feature-maintainer/references/code-map.md',
    'skills/public/skyviz-feature-maintainer/references/change-checklists.md',
    'site/index.html',
    'site/styles.css',
    'site/src/main.js',
    'site/src/data.js',
    'site/src/charts.js',
    'site/data/reference/models.json',
    'site/data/reference/airports.json',
    'site/data/reference/manifest.json',
    'scripts/refresh_completionist_snapshot.py',
    '.github/workflows/ci.yml',
    '.github/workflows/deploy-pages.yml',
]


def main() -> int:
    missing = [path for path in REQUIRED_PATHS if not (REPO_ROOT / path).exists()]
    if missing:
        print('repo_hygiene_check: missing required paths', file=sys.stderr)
        for path in missing:
            print(f' - {path}', file=sys.stderr)
        return 1
    print('repo_hygiene_check: ok')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
