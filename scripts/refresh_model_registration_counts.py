from __future__ import annotations

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = 'https://api.skycards.oldapes.com'
DEFAULT_CLIENT_VERSION = '2.0.24'
DEFAULT_TIMEOUT_SECONDS = 20
DEFAULT_MAX_WORKERS = 12
DEFAULT_RETRIES = 2
DEFAULT_RETRY_DELAY_SECONDS = 0.35
DEFAULT_MODELS_PATH = Path('site/data/reference/models.json')
DEFAULT_OUT_PATH = Path('site/data/reference/model_registration_counts.json')


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def load_model_ids(models_path: Path) -> list[str]:
    with models_path.open('r', encoding='utf-8') as handle:
        payload = json.load(handle)
    rows = payload.get('rows')
    if not isinstance(rows, list):
        raise ValueError(f'{models_path} has no rows list')
    model_ids = {
        str(row.get('id', '')).strip().upper()
        for row in rows
        if isinstance(row, dict) and str(row.get('id', '')).strip()
    }
    return sorted(model_ids)


def fetch_count_for_model(
    model_id: str,
    *,
    base_url: str,
    client_version: str,
    timeout_seconds: int,
    retries: int,
    retry_delay_seconds: float,
) -> tuple[str, int | None, str]:
    url = f"{base_url.rstrip('/')}/models/count/{quote(model_id)}"
    request = Request(
        url,
        headers={
            'Accept': 'application/json',
            'x-client-version': client_version,
        },
    )

    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                body = response.read().decode('utf-8', errors='replace').strip()
            return model_id, int(body), 'ok'
        except HTTPError as error:
            if error.code == 404:
                return model_id, None, 'not_found'
            if attempt < retries and error.code in {429, 500, 502, 503, 504}:
                time.sleep(retry_delay_seconds * (attempt + 1))
                continue
            return model_id, None, f'http_{error.code}'
        except (URLError, TimeoutError, ValueError):
            if attempt < retries:
                time.sleep(retry_delay_seconds * (attempt + 1))
                continue
            return model_id, None, 'error'

    return model_id, None, 'error'


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Refresh model registration totals from /models/count/{icao}.')
    parser.add_argument(
        '--models-path',
        default=str(DEFAULT_MODELS_PATH),
        help='Path to models.json (used to discover ICAO/model IDs).',
    )
    parser.add_argument(
        '--out',
        default=str(DEFAULT_OUT_PATH),
        help='Output JSON path.',
    )
    parser.add_argument(
        '--base-url',
        default=DEFAULT_BASE_URL,
        help='Skycards API base URL.',
    )
    parser.add_argument(
        '--client-version',
        default=DEFAULT_CLIENT_VERSION,
        help='Value for x-client-version request header.',
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help='Request timeout in seconds.',
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=DEFAULT_MAX_WORKERS,
        help='Maximum concurrent requests.',
    )
    parser.add_argument(
        '--retries',
        type=int,
        default=DEFAULT_RETRIES,
        help='Retry count per model for transient failures.',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    models_path = Path(args.models_path)
    out_path = Path(args.out)

    model_ids = load_model_ids(models_path)
    if not model_ids:
        raise SystemExit(f'no model IDs found in {models_path}')

    counts_by_model_id: dict[str, int] = {}
    missing_model_ids: list[str] = []
    failed_model_ids: list[dict[str, str]] = []

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = [
            executor.submit(
                fetch_count_for_model,
                model_id,
                base_url=args.base_url,
                client_version=args.client_version,
                timeout_seconds=max(1, args.timeout),
                retries=max(0, args.retries),
                retry_delay_seconds=DEFAULT_RETRY_DELAY_SECONDS,
            )
            for model_id in model_ids
        ]
        for future in as_completed(futures):
            model_id, count, status = future.result()
            if status == 'ok' and count is not None:
                counts_by_model_id[model_id] = count
            elif status == 'not_found':
                missing_model_ids.append(model_id)
            else:
                failed_model_ids.append({'modelId': model_id, 'status': status})

    payload = {
        'source': 'Skycards API',
        'baseUrl': args.base_url,
        'clientVersion': args.client_version,
        'generatedAt': utc_now_iso(),
        'endpointTemplate': '/models/count/{icao}',
        'modelCount': len(model_ids),
        'countRows': len(counts_by_model_id),
        'missingRows': len(missing_model_ids),
        'failedRows': len(failed_model_ids),
        'countsByModelId': dict(sorted(counts_by_model_id.items())),
        'missingModelIds': sorted(missing_model_ids),
        'failedModelIds': sorted(failed_model_ids, key=lambda row: row['modelId']),
    }
    write_json(out_path, payload)

    print(
        'model registration counts refreshed:',
        f'models={len(model_ids)}',
        f'count_rows={len(counts_by_model_id)}',
        f'missing={len(missing_model_ids)}',
        f'failed={len(failed_model_ids)}',
    )
    print(f'wrote {out_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
