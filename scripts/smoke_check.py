from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_json(path: Path) -> object:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def check_repo_hygiene() -> None:
    result = subprocess.run(
        [sys.executable, str(REPO_ROOT / 'scripts' / 'repo_hygiene_check.py')],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout.strip())
    if result.returncode != 0:
        if result.stderr:
            print(result.stderr.strip(), file=sys.stderr)
        raise SystemExit(result.returncode)


def check_sample_collection() -> None:
    sample_path = REPO_ROOT / 'skycards_user.json'
    payload = _load_json(sample_path)
    required_keys = {
        'id',
        'name',
        'xp',
        'cards',
        'numAircraftModels',
        'numDestinations',
        'numBattleWins',
        'numAchievements',
        'unlockedAirportIds',
        'uniqueRegs',
    }
    missing = sorted(required_keys - set(payload))
    if missing:
        raise SystemExit(f'smoke_check: sample payload missing keys: {missing}')
    if not isinstance(payload.get('cards'), list) or not payload['cards']:
        raise SystemExit('smoke_check: sample payload has no cards')
    if not isinstance(payload.get('unlockedAirportIds'), list):
        raise SystemExit('smoke_check: unlockedAirportIds is not a list')
    if not isinstance(payload.get('uniqueRegs'), list):
        raise SystemExit('smoke_check: uniqueRegs is not a list')
    first_card = payload['cards'][0]
    for field in ('modelId', 'manufacturer', 'name', 'tier', 'category'):
        if field not in first_card:
            raise SystemExit(f'smoke_check: first card missing {field}')
    print(
        'sample payload:',
        f"cards={len(payload['cards'])}",
        f"airports={len(payload['unlockedAirportIds'])}",
        f"unique_regs={len(payload['uniqueRegs'])}",
    )


def check_reference_data() -> None:
    manifest = _load_json(REPO_ROOT / 'site' / 'data' / 'reference' / 'manifest.json')
    models = _load_json(REPO_ROOT / 'site' / 'data' / 'reference' / 'models.json')
    airports = _load_json(REPO_ROOT / 'site' / 'data' / 'reference' / 'airports.json')

    if 'datasets' not in manifest:
        raise SystemExit('smoke_check: manifest missing datasets')
    if not isinstance(models.get('rows'), list) or not models['rows']:
        raise SystemExit('smoke_check: models.json rows missing or empty')
    if not isinstance(airports.get('rows'), list) or not airports['rows']:
        raise SystemExit('smoke_check: airports.json rows missing or empty')
    print(
        'reference payloads:',
        f"models={len(models['rows'])}",
        f"airports={len(airports['rows'])}",
    )


def main() -> int:
    check_repo_hygiene()
    check_sample_collection()
    check_reference_data()
    print('smoke_check: ok')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
