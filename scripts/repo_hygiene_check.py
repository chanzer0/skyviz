from __future__ import annotations

import argparse
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

CORE_REQUIRED_PATHS = [
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
    'scripts/refresh_completionist_snapshot.py',
    '.github/workflows/ci.yml',
    '.github/workflows/deploy-pages.yml',
]

FULL_MODE_ONLY_PATHS = [
    'site/data/reference/models.json',
    'site/data/reference/airports.json',
    'site/data/reference/manifest.json',
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--mode',
        choices=('full', 'completionist-only'),
        default='full',
        help='Validation mode. completionist-only skips gitignored reference artifacts.',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    required_paths = list(CORE_REQUIRED_PATHS)
    if args.mode == 'full':
        required_paths.extend(FULL_MODE_ONLY_PATHS)

    missing = [path for path in required_paths if not (REPO_ROOT / path).exists()]
    if missing:
        print('repo_hygiene_check: missing required paths', file=sys.stderr)
        for path in missing:
            print(f' - {path}', file=sys.stderr)
        return 1
    print('repo_hygiene_check: ok')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
