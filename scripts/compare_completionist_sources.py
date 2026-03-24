#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_CONFIG_PATH = REPO_ROOT / 'site' / 'data' / 'runtime-config.json'
DEFAULT_TIMEOUT_SECONDS = 30.0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            'Compare two completionist manifest/snapshot pairs and summarize freshness, row-count, '
            'and flight-id overlap. When manifest URLs are omitted, the script uses skyviz runtime-config '
            'active/shadow completionist sources.'
        )
    )
    parser.add_argument('--left-manifest-url', help='Explicit baseline manifest URL')
    parser.add_argument('--right-manifest-url', help='Explicit candidate manifest URL')
    parser.add_argument(
        '--left-source',
        help='Runtime-config source key or alias for the left side (active, shadow, or a source key)',
    )
    parser.add_argument(
        '--right-source',
        help='Runtime-config source key or alias for the right side (active, shadow, or a source key)',
    )
    parser.add_argument(
        '--sample-limit',
        type=int,
        default=10,
        help='Maximum differing flight IDs to print per side',
    )
    parser.add_argument(
        '--timeout-seconds',
        type=float,
        default=DEFAULT_TIMEOUT_SECONDS,
        help='HTTP timeout for manifest and snapshot fetches',
    )
    return parser.parse_args()


def _load_json(path: Path) -> Any:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def _normalize_text(value: Any) -> str:
    if value is None:
        return ''
    return str(value).strip()


def _normalize_code(value: Any) -> str:
    return _normalize_text(value).upper()


def _normalize_source_key(value: Any) -> str:
    return _normalize_text(value).lower()


def _load_runtime_completionist_sources() -> dict[str, Any]:
    config = _load_json(RUNTIME_CONFIG_PATH)
    completionist = config.get('completionist') if isinstance(config, dict) else None
    if not isinstance(completionist, dict):
        raise SystemExit('compare_completionist_sources: runtime-config missing completionist object')
    raw_sources = completionist.get('sources')
    sources: dict[str, dict[str, str]] = {}
    if isinstance(raw_sources, dict):
        for raw_key, raw_source in raw_sources.items():
            if not isinstance(raw_source, dict):
                continue
            source_key = _normalize_source_key(raw_key)
            manifest_url = _normalize_text(raw_source.get('manifestUrl'))
            if not source_key or not manifest_url:
                continue
            sources[source_key] = {
                'key': _normalize_text(raw_key) or source_key,
                'label': _normalize_text(raw_source.get('label')) or raw_key,
                'manifest_url': manifest_url,
            }
    return {
        'sources': sources,
        'active_source': _normalize_source_key(completionist.get('activeSource')),
        'shadow_source': _normalize_source_key(completionist.get('shadowSource')),
    }


def _resolve_source_alias(alias: str, runtime_sources: dict[str, Any]) -> str:
    normalized = _normalize_source_key(alias)
    if normalized == 'active':
        return _normalize_text(runtime_sources.get('active_source'))
    if normalized == 'shadow':
        return _normalize_text(runtime_sources.get('shadow_source'))
    return normalized


def _resolve_manifest_target(
    runtime_sources: dict[str, Any],
    manifest_url: str,
    source_key: str,
    fallback_alias: str,
) -> dict[str, str]:
    explicit_manifest_url = _normalize_text(manifest_url)
    if explicit_manifest_url:
        explicit_source_key = _normalize_text(source_key) or 'explicit-url'
        return {
            'key': explicit_source_key,
            'label': explicit_source_key,
            'manifest_url': explicit_manifest_url,
        }

    resolved_source_key = _resolve_source_alias(
        source_key or fallback_alias,
        runtime_sources,
    )
    if not resolved_source_key:
        raise SystemExit(
            'compare_completionist_sources: runtime-config is missing the requested completionist source'
        )
    source = runtime_sources['sources'].get(resolved_source_key)
    if not source:
        raise SystemExit(
            f'compare_completionist_sources: completionist source {resolved_source_key!r} is not defined in runtime-config'
        )
    return source


def _fetch_json(url: str, timeout_seconds: float) -> Any:
    request = Request(
        url,
        headers={
            'Accept': 'application/json',
            'Cache-Control': 'no-store',
            'User-Agent': 'skyviz-completionist-compare/1',
        },
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            body = response.read().decode('utf-8')
    except HTTPError as exc:
        raise RuntimeError(f'Failed to load {url}: HTTP {exc.code}') from exc
    except URLError as exc:
        raise RuntimeError(f'Failed to load {url}: {exc.reason}') from exc
    return json.loads(body)


def _resolve_snapshot_url(manifest_url: str, manifest: dict[str, Any]) -> str:
    snapshot_path = _normalize_text(manifest.get('snapshotPath'))
    if not snapshot_path:
        raise ValueError(f'Manifest {manifest_url} is missing snapshotPath')
    return urljoin(manifest_url, snapshot_path)


def _as_number(value: Any) -> float | None:
    if value in (None, ''):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _as_int(value: Any) -> int | None:
    parsed = _as_number(value)
    return int(parsed) if parsed is not None else None


def _normalize_completionist_row(raw_row: Any, fields: list[str]) -> dict[str, Any] | None:
    if not isinstance(raw_row, (list, dict)):
        return None
    field_index = {field: index for index, field in enumerate(fields)}

    def read_value(key: str) -> Any:
        if isinstance(raw_row, list):
            index = field_index.get(key, -1)
            return raw_row[index] if 0 <= index < len(raw_row) else None
        return raw_row.get(key)

    flight_id = _normalize_text(read_value('flightId') or read_value('id'))
    lat = _as_number(read_value('lat'))
    lon = _as_number(read_value('lon'))
    if not flight_id or lat is None or lon is None:
        return None
    return {
        'flightId': flight_id,
        'aircraftHex': _normalize_code(read_value('aircraftHex') or read_value('hex')),
        'lat': lat,
        'lon': lon,
        'track': _as_int(read_value('track')),
        'altitude': _as_int(read_value('altitude')),
        'speed': _as_int(read_value('speed')),
        'typeCode': _normalize_code(read_value('typeCode')),
        'registration': _normalize_code(read_value('registration')),
        'seenAt': _as_int(read_value('seenAt')),
        'origin': _normalize_code(read_value('origin')),
        'destination': _normalize_code(read_value('destination')),
        'flightNumber': _normalize_code(read_value('flightNumber')),
        'callsign': _normalize_code(read_value('callsign')),
    }


def _load_snapshot_bundle(target: dict[str, str], timeout_seconds: float) -> dict[str, Any]:
    manifest = _fetch_json(target['manifest_url'], timeout_seconds)
    if not isinstance(manifest, dict):
        raise ValueError(f"Manifest {target['manifest_url']} was not a JSON object")
    snapshot_url = _resolve_snapshot_url(target['manifest_url'], manifest)
    snapshot = _fetch_json(snapshot_url, timeout_seconds)
    if not isinstance(snapshot, dict):
        raise ValueError(f'Snapshot {snapshot_url} was not a JSON object')
    fields = [str(field).strip() for field in snapshot.get('fields') or []]
    rows = [
        normalized
        for raw_row in snapshot.get('rows') or []
        if (normalized := _normalize_completionist_row(raw_row, fields)) is not None
    ]
    return {
        'key': target['key'],
        'label': target['label'],
        'manifest_url': target['manifest_url'],
        'manifest': manifest,
        'snapshot_url': snapshot_url,
        'snapshot': snapshot,
        'fields': fields,
        'rows': rows,
        'rows_by_id': {row['flightId']: row for row in rows},
    }


def _parse_generated_at(raw_value: Any) -> datetime | None:
    text = _normalize_text(raw_value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace('Z', '+00:00'))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _format_age(raw_value: Any) -> str:
    generated_at = _parse_generated_at(raw_value)
    if generated_at is None:
        return 'unknown'
    age_seconds = max((datetime.now(timezone.utc) - generated_at).total_seconds(), 0.0)
    if age_seconds < 60:
        return f'{int(age_seconds)}s'
    if age_seconds < 3600:
        return f'{int(age_seconds // 60)}m'
    return f'{int(age_seconds // 3600)}h{int((age_seconds % 3600) // 60)}m'


def _count_equal(common_ids: set[str], left_rows: dict[str, dict[str, Any]], right_rows: dict[str, dict[str, Any]], key: str) -> int:
    matches = 0
    for flight_id in common_ids:
        if left_rows[flight_id].get(key) == right_rows[flight_id].get(key):
            matches += 1
    return matches


def _print_side(label: str, bundle: dict[str, Any]) -> None:
    manifest = bundle['manifest']
    print(
        f'{label}:',
        f"source={bundle['key']}",
        f"label={bundle['label']}",
        f"manifest={bundle['manifest_url']}",
        f"snapshot={bundle['snapshot_url']}",
    )
    print(
        '  ',
        f"generated_at={manifest.get('generatedAt') or bundle['snapshot'].get('generatedAt') or 'n/a'}",
        f"age={_format_age(manifest.get('generatedAt') or bundle['snapshot'].get('generatedAt'))}",
        f"manifest_row_count={manifest.get('rowCount')}",
        f"snapshot_row_count={len(bundle['rows'])}",
        f"publish_interval_seconds={manifest.get('publishIntervalSeconds')}",
        f"stale_after_seconds={manifest.get('staleAfterSeconds')}",
    )


def main() -> int:
    args = _parse_args()
    try:
        runtime_sources = _load_runtime_completionist_sources()
        left_target = _resolve_manifest_target(
            runtime_sources,
            args.left_manifest_url or '',
            args.left_source or '',
            'active',
        )
        right_target = _resolve_manifest_target(
            runtime_sources,
            args.right_manifest_url or '',
            args.right_source or '',
            'shadow',
        )

        left = _load_snapshot_bundle(left_target, args.timeout_seconds)
        right = _load_snapshot_bundle(right_target, args.timeout_seconds)
    except RuntimeError as exc:
        raise SystemExit(f'compare_completionist_sources: {exc}') from None

    _print_side('Left', left)
    _print_side('Right', right)

    left_ids = set(left['rows_by_id'])
    right_ids = set(right['rows_by_id'])
    common_ids = left_ids & right_ids
    left_only = sorted(left_ids - right_ids)
    right_only = sorted(right_ids - left_ids)

    print(
        'Overlap:',
        f'common={len(common_ids)}',
        f'left_only={len(left_only)}',
        f'right_only={len(right_only)}',
    )
    if common_ids:
        print(
            'Field parity on shared flight IDs:',
            f"registration={_count_equal(common_ids, left['rows_by_id'], right['rows_by_id'], 'registration')}/{len(common_ids)}",
            f"type_code={_count_equal(common_ids, left['rows_by_id'], right['rows_by_id'], 'typeCode')}/{len(common_ids)}",
            f"origin={_count_equal(common_ids, left['rows_by_id'], right['rows_by_id'], 'origin')}/{len(common_ids)}",
            f"destination={_count_equal(common_ids, left['rows_by_id'], right['rows_by_id'], 'destination')}/{len(common_ids)}",
        )

    sample_limit = max(1, args.sample_limit)
    if left_only:
        print('Sample left-only flight IDs:', ', '.join(left_only[:sample_limit]))
    if right_only:
        print('Sample right-only flight IDs:', ', '.join(right_only[:sample_limit]))

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
