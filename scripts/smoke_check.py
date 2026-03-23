from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_CLOUDFLARE_ACCOUNT_ID = '172da47da00e3b33810d2e9c73c9a0b9'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--mode',
        choices=('full', 'completionist-only'),
        default='full',
        help='Validation mode. completionist-only skips reference and airport daily assertions.',
    )
    return parser.parse_args()


def _load_json(path: Path) -> object:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def _assert_manifest_dataset(manifest: dict, dataset_key: str, path: Path) -> None:
    dataset = manifest.get('datasets', {}).get(dataset_key)
    if not isinstance(dataset, dict):
        raise SystemExit(f'smoke_check: manifest missing dataset entry for {dataset_key}')
    manifest_path = dataset.get('path')
    expected_path = f'./{path.name}'
    if manifest_path != expected_path:
        raise SystemExit(
            f'smoke_check: manifest dataset path mismatch for {dataset_key}: '
            f'expected {expected_path}, got {manifest_path!r}',
        )


def check_repo_hygiene(mode: str) -> None:
    result = subprocess.run(
        [sys.executable, str(REPO_ROOT / 'scripts' / 'repo_hygiene_check.py'), '--mode', mode],
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
    if not sample_path.exists():
        raise SystemExit('smoke_check: missing repo-root skycards_user.json fixture')
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
        'real validation payload:',
        f'path={sample_path.relative_to(REPO_ROOT)}',
        f"cards={len(payload['cards'])}",
        f"airports={len(payload['unlockedAirportIds'])}",
        f'unique_regs={len(caught_rows)}',
    )


def check_runtime_config() -> None:
    config_path = REPO_ROOT / 'site' / 'data' / 'runtime-config.json'
    config = _load_json(config_path)
    completionist = config.get('completionist') if isinstance(config, dict) else None
    manifest_url = ''
    if isinstance(completionist, dict):
        manifest_url = str(completionist.get('manifestUrl') or '').strip()
    elif isinstance(config, dict):
        manifest_url = str(config.get('completionistManifestUrl') or '').strip()
    if not manifest_url:
        raise SystemExit('smoke_check: runtime-config missing completionist manifestUrl')
    print('runtime config:', f'manifest_url={manifest_url}')


def check_cloudflare_worker_config() -> None:
    config_path = REPO_ROOT / 'workers' / 'completionist-live' / 'wrangler.jsonc'
    text = config_path.read_text(encoding='utf-8')
    match = re.search(r'"account_id"\s*:\s*"([^"]+)"', text)
    if not match:
        raise SystemExit('smoke_check: wrangler config missing account_id')
    account_id = match.group(1).strip()
    if account_id != EXPECTED_CLOUDFLARE_ACCOUNT_ID:
        raise SystemExit(
            'smoke_check: wrangler config account_id mismatch: '
            f'expected {EXPECTED_CLOUDFLARE_ACCOUNT_ID}, got {account_id}',
        )
    print('cloudflare worker config:', f'account_id={account_id}')


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
    _assert_manifest_dataset(manifest, 'models', REPO_ROOT / 'site' / 'data' / 'reference' / 'models.json')
    _assert_manifest_dataset(manifest, 'airports', REPO_ROOT / 'site' / 'data' / 'reference' / 'airports.json')
    print(
        'reference payloads:',
        f"models={len(models['rows'])}",
        f"airports={len(airports['rows'])}",
    )
    if model_registration_counts_path.exists():
        model_registration_counts = _load_json(model_registration_counts_path)
        if not isinstance(model_registration_counts.get('countsByModelId'), dict):
            raise SystemExit('smoke_check: model_registration_counts.json countsByModelId missing')
        _assert_manifest_dataset(manifest, 'modelRegistrationCounts', model_registration_counts_path)
        print('reference registration counts:', f"models={len(model_registration_counts['countsByModelId'])}")
    if aircraft_lookup_path.exists():
        aircraft_lookup = _load_json(aircraft_lookup_path)
        if not isinstance(aircraft_lookup.get('byAircraftHex'), dict):
            raise SystemExit('smoke_check: aircraft_lookup.json byAircraftHex missing')
        _assert_manifest_dataset(manifest, 'aircraftLookup', aircraft_lookup_path)
        print('reference aircraft lookup:', f"hex_rows={len(aircraft_lookup['byAircraftHex'])}")
    if aircraft_lookup_resolved_path.exists():
        aircraft_lookup_resolved = _load_json(aircraft_lookup_resolved_path)
        if not isinstance(aircraft_lookup_resolved.get('byAircraftHex'), dict):
            raise SystemExit('smoke_check: aircraft_lookup_resolved.json byAircraftHex missing')
        _assert_manifest_dataset(manifest, 'aircraftLookupResolved', aircraft_lookup_resolved_path)
        print('reference aircraft lookup (resolved):', f"hex_rows={len(aircraft_lookup_resolved['byAircraftHex'])}")


def check_airport_daily_game_data() -> None:
    manifest_path = REPO_ROOT / 'site' / 'data' / 'airports' / 'manifest.json'
    dataset_path = REPO_ROOT / 'site' / 'data' / 'airports' / 'daily-game.json'
    manifest = _load_json(manifest_path)
    dataset = _load_json(dataset_path)
    if dataset.get('source') != 'OurAirports Open Data':
        raise SystemExit('smoke_check: airport daily dataset source mismatch')
    if not isinstance(dataset.get('airports'), list) or not dataset['airports']:
        raise SystemExit('smoke_check: airport daily dataset has no airports')
    if manifest.get('dailyDataPath') != './daily-game.json':
        raise SystemExit('smoke_check: airport daily manifest dailyDataPath mismatch')
    if int(manifest.get('guessableAirports') or 0) != len(dataset['airports']):
        raise SystemExit('smoke_check: airport daily manifest guessableAirports does not match dataset length')
    first_airport = dataset['airports'][0]
    required_fields = {
        'id',
        'ident',
        'displayCode',
        'name',
        'continent',
        'countryCode',
        'regionCode',
        'runwayCount',
        'navaidCount',
        'targetTier',
    }
    missing = sorted(required_fields - set(first_airport))
    if missing:
        raise SystemExit(f'smoke_check: airport daily dataset first row missing fields: {missing}')
    print(
        'airport daily dataset:',
        f"airports={len(dataset['airports'])}",
        f"hub={manifest.get('targetTierCounts', {}).get('hub', 0)}",
        f"regional={manifest.get('targetTierCounts', {}).get('regional', 0)}",
        f"frontier={manifest.get('targetTierCounts', {}).get('frontier', 0)}",
    )


def check_completionist_live_data() -> None:
    manifest_path = REPO_ROOT / 'site' / 'data' / 'live' / 'completionist-manifest.json'
    snapshot_path = REPO_ROOT / 'site' / 'data' / 'live' / 'completionist-snapshot.json'
    if not manifest_path.exists() or not snapshot_path.exists():
        print('completionist snapshot: skipped (live snapshot artifacts not present)')
        return
    manifest = _load_json(manifest_path)
    snapshot = _load_json(snapshot_path)
    if manifest.get('snapshotPath') != './completionist-snapshot.json':
        raise SystemExit('smoke_check: completionist manifest snapshotPath mismatch')
    if 'sourceUrl' in manifest or 'sourceUrl' in snapshot:
        raise SystemExit('smoke_check: completionist snapshot should not publish sourceUrl')
    if 'source' in manifest or 'source' in snapshot:
        raise SystemExit('smoke_check: completionist snapshot should not publish source labels')
    manifest_fields = manifest.get('fields')
    snapshot_fields = snapshot.get('fields')
    if not isinstance(manifest_fields, list) or not manifest_fields:
        raise SystemExit('smoke_check: completionist manifest fields missing')
    if manifest_fields != snapshot_fields:
        raise SystemExit('smoke_check: completionist manifest fields do not match snapshot fields')
    for key in ('uiRefreshIntervalSeconds', 'publishIntervalSeconds', 'staleAfterSeconds'):
        if int(manifest.get(key) or 0) <= 0:
            raise SystemExit(f'smoke_check: completionist manifest {key} must be positive')
    rows = snapshot.get('rows')
    if not isinstance(rows, list):
        raise SystemExit('smoke_check: completionist snapshot rows missing')
    if int(manifest.get('rowCount') or 0) != len(rows):
        raise SystemExit('smoke_check: completionist manifest rowCount does not match snapshot length')
    print(
        'completionist snapshot:',
        f'rows={len(rows)}',
        f"generated_at={manifest.get('generatedAt') or 'placeholder'}",
    )


def main() -> int:
    args = parse_args()
    check_repo_hygiene(args.mode)
    check_sample_collection()
    check_runtime_config()
    check_cloudflare_worker_config()
    if args.mode == 'full':
        check_reference_data()
        check_airport_daily_game_data()
    else:
        print('smoke_check: completionist-only mode; skipped reference and airport daily assertions')
    check_completionist_live_data()
    print('smoke_check: ok')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
