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
    candidate_paths = [
        REPO_ROOT / 'skycards_user.json',
        REPO_ROOT / 'site' / 'data' / 'example' / 'try_now_user.json',
    ]
    sample_path = next((path for path in candidate_paths if path.exists()), None)
    if sample_path is None:
        raise SystemExit('smoke_check: no sample collection JSON found')
    payload = _load_json(sample_path)
    required_keys = {
        'id',
        'name',
        'xp',
        'cards',
        'unlockedAirportIds',
    }
    missing = sorted(required_keys - set(payload))
    if missing:
        raise SystemExit(f'smoke_check: sample payload missing keys: {missing}')
    if not isinstance(payload.get('cards'), list) or not payload['cards']:
        raise SystemExit('smoke_check: sample payload has no cards')
    if not isinstance(payload.get('unlockedAirportIds'), list):
        raise SystemExit('smoke_check: unlockedAirportIds is not a list')
    if not isinstance(payload.get('uniqueRegs'), list) and not isinstance(payload.get('caughtRegistrations'), list):
        raise SystemExit('smoke_check: payload has neither uniqueRegs nor caughtRegistrations array')
    caught_rows = payload.get('caughtRegistrations') if isinstance(payload.get('caughtRegistrations'), list) else payload['uniqueRegs']
    first_card = payload['cards'][0]
    for field in ('modelId', 'manufacturer', 'name', 'tier', 'category'):
        if field not in first_card:
            raise SystemExit(f'smoke_check: first card missing {field}')
    print(
        'sample payload:',
        f'path={sample_path.relative_to(REPO_ROOT)}',
        f"cards={len(payload['cards'])}",
        f"airports={len(payload['unlockedAirportIds'])}",
        f'unique_regs={len(caught_rows)}',
    )


def check_reference_data() -> None:
    manifest = _load_json(REPO_ROOT / 'site' / 'data' / 'reference' / 'manifest.json')
    models = _load_json(REPO_ROOT / 'site' / 'data' / 'reference' / 'models.json')
    airports = _load_json(REPO_ROOT / 'site' / 'data' / 'reference' / 'airports.json')
    model_registration_counts_path = REPO_ROOT / 'site' / 'data' / 'reference' / 'model_registration_counts.json'
    aircraft_lookup_path = REPO_ROOT / 'site' / 'data' / 'reference' / 'aircraft_lookup.json'
    aircraft_lookup_resolved_path = REPO_ROOT / 'site' / 'data' / 'reference' / 'aircraft_lookup_resolved.json'

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
    if model_registration_counts_path.exists():
        model_registration_counts = _load_json(model_registration_counts_path)
        if not isinstance(model_registration_counts.get('countsByModelId'), dict):
            raise SystemExit('smoke_check: model_registration_counts.json countsByModelId missing')
        print('reference registration counts:', f"models={len(model_registration_counts['countsByModelId'])}")
    if aircraft_lookup_path.exists():
        aircraft_lookup = _load_json(aircraft_lookup_path)
        if not isinstance(aircraft_lookup.get('byAircraftHex'), dict):
            raise SystemExit('smoke_check: aircraft_lookup.json byAircraftHex missing')
        print('reference aircraft lookup:', f"hex_rows={len(aircraft_lookup['byAircraftHex'])}")
    if aircraft_lookup_resolved_path.exists():
        aircraft_lookup_resolved = _load_json(aircraft_lookup_resolved_path)
        if not isinstance(aircraft_lookup_resolved.get('byAircraftHex'), dict):
            raise SystemExit('smoke_check: aircraft_lookup_resolved.json byAircraftHex missing')
        print('reference aircraft lookup (resolved):', f"hex_rows={len(aircraft_lookup_resolved['byAircraftHex'])}")


def main() -> int:
    check_repo_hygiene()
    check_sample_collection()
    check_reference_data()
    print('smoke_check: ok')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
