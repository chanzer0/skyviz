from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = 'https://api.skycards.oldapes.com'
DEFAULT_CLIENT_VERSION = '2.0.24'
DEFAULT_TIMEOUT_SECONDS = 30
DATASETS = ('models', 'airports')
OPTIONAL_MANIFEST_DATASETS = {
    'modelRegistrationCounts': {
        'file': 'model_registration_counts.json',
        'rows_key': 'countsByModelId',
    },
    'aircraftLookup': {
        'file': 'aircraft_lookup.json',
        'rows_key': 'byAircraftHex',
    },
    'aircraftLookupResolved': {
        'file': 'aircraft_lookup_resolved.json',
        'rows_key': 'byAircraftHex',
    },
    'inferredAircraftMappings': {
        'file': 'inferred_aircraft_type_mappings.json',
        'rows_key': 'rows',
    },
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def fetch_payload(base_url: str, dataset: str, client_version: str, timeout_seconds: int) -> dict:
    url = f"{base_url.rstrip('/')}/{dataset}"
    request = Request(
        url,
        headers={
            'Accept': 'application/json',
            'x-client-version': client_version,
        },
    )
    with urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read())
    if not isinstance(payload, dict):
        raise ValueError(f'{dataset} payload is not a JSON object')
    rows = payload.get('rows')
    if not isinstance(rows, list):
        raise ValueError(f'{dataset} payload has no rows list')
    return payload


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def build_manifest(base_url: str, client_version: str, payloads: dict[str, dict]) -> dict:
    datasets = {}
    for dataset, payload in payloads.items():
        datasets[dataset] = {
            'updatedAt': payload.get('updatedAt'),
            'rows': len(payload.get('rows', [])),
            'path': f'./{dataset}.json',
        }
    return {
        'source': 'Skycards API',
        'baseUrl': base_url,
        'clientVersion': client_version,
        'generatedAt': utc_now_iso(),
        'datasets': datasets,
    }


def add_optional_manifest_datasets(manifest: dict, out_dir: Path) -> None:
    datasets = manifest.setdefault('datasets', {})
    for manifest_key, config in OPTIONAL_MANIFEST_DATASETS.items():
        path = out_dir / config['file']
        if not path.exists():
            continue
        with path.open('r', encoding='utf-8') as handle:
            payload = json.load(handle)
        rows_payload = payload.get(config['rows_key'])
        if isinstance(rows_payload, dict):
            rows = len(rows_payload)
        elif isinstance(rows_payload, list):
            rows = len(rows_payload)
        else:
            rows = 0
        datasets[manifest_key] = {
            'updatedAt': payload.get('generatedAt') or payload.get('updatedAt'),
            'rows': rows,
            'path': f"./{config['file']}",
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Refresh committed Skycards reference data snapshots.')
    parser.add_argument(
        '--dataset',
        choices=('all',) + DATASETS,
        default='all',
        help='Refresh one dataset or both.',
    )
    parser.add_argument(
        '--base-url',
        default=DEFAULT_BASE_URL,
        help='Skycards API base URL.',
    )
    parser.add_argument(
        '--client-version',
        default=DEFAULT_CLIENT_VERSION,
        help='Value for the x-client-version header.',
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help='Request timeout in seconds.',
    )
    parser.add_argument(
        '--out-dir',
        default='site/data/reference',
        help='Directory to write the committed JSON snapshots into.',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out_dir = Path(args.out_dir)
    targets = DATASETS if args.dataset == 'all' else (args.dataset,)
    payloads: dict[str, dict] = {}

    for dataset in targets:
        payload = fetch_payload(args.base_url, dataset, args.client_version, args.timeout)
        payloads[dataset] = payload
        write_json(out_dir / f'{dataset}.json', payload)
        print(f"refreshed {dataset}: rows={len(payload.get('rows', []))} updatedAt={payload.get('updatedAt')}")

    existing_payloads = {}
    for dataset in DATASETS:
        path = out_dir / f'{dataset}.json'
        if path.exists():
            with path.open('r', encoding='utf-8') as handle:
                existing_payloads[dataset] = json.load(handle)
    manifest = build_manifest(args.base_url, args.client_version, existing_payloads)
    add_optional_manifest_datasets(manifest, out_dir)
    write_json(out_dir / 'manifest.json', manifest)
    print(f"wrote manifest: {out_dir / 'manifest.json'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
