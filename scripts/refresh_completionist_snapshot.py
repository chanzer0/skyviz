from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
import json
from datetime import datetime, timezone
from pathlib import Path
from time import sleep
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


DEFAULT_FEED_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js'
DEFAULT_OUT_DIR = Path('site/data/live')
MANIFEST_FILE = 'completionist-manifest.json'
SNAPSHOT_FILE = 'completionist-snapshot.json'
DEFAULT_INITIAL_TILE_DEGREES = 60.0
DEFAULT_MIN_TILE_DEGREES = 7.5
DEFAULT_MAX_REQUESTS = 96
DEFAULT_REQUEST_DELAY_SECONDS = 0.2
FEED_CAP_THRESHOLD = 1500
IGNORED_PAYLOAD_KEYS = {'full_count', 'version', 'stats'}
REQUEST_HEADERS = {
    'accept': 'application/json',
    'accept-encoding': 'identity',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'max-age=0',
    'origin': 'https://www.flightradar24.com',
    'referer': 'https://www.flightradar24.com/',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/145.0.0.0 Safari/537.36'
    ),
}
DEFAULT_FEED_PARAMS = {
    'faa': '1',
    'satellite': '1',
    'mlat': '1',
    'flarm': '1',
    'adsb': '1',
    'air': '1',
    'gnd': '0',
    'vehicles': '0',
    'estimated': '1',
    'maxage': '14400',
    'gliders': '1',
    'stats': '1',
    'limit': '5000',
}
SNAPSHOT_FIELDS = [
    'flightId',
    'aircraftHex',
    'lat',
    'lon',
    'track',
    'altitude',
    'speed',
    'typeCode',
    'registration',
    'seenAt',
    'origin',
    'destination',
    'flightNumber',
    'callsign',
]


@dataclass(frozen=True, slots=True)
class FeedTile:
    south: float
    north: float
    west: float
    east: float


@dataclass(slots=True)
class SweepStats:
    requestCount: int = 0
    seedTileCount: int = 0
    cappedTileCount: int = 0
    splitTileCount: int = 0
    skippedRows: int = 0
    budgetExhausted: bool = False
    sourceFullCountMax: int = 0
    version: int | None = None


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def normalize_text(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def normalize_code(value: Any) -> str:
    return normalize_text(value).upper()


def as_float(value: Any) -> float | None:
    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return None
    return numeric_value


def as_int(value: Any) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def build_feed_url(base_url: str, extra_params: dict[str, str]) -> str:
    parsed = urlsplit(base_url)
    base_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    merged_params = {**DEFAULT_FEED_PARAMS, **base_params, **extra_params}
    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(merged_params),
            parsed.fragment,
        )
    )


def fetch_feed(url: str, timeout_seconds: float) -> dict[str, Any]:
    request = Request(url, headers=REQUEST_HEADERS)
    with urlopen(request, timeout=timeout_seconds) as response:
        payload = json.load(response)
    if not isinstance(payload, dict):
        raise SystemExit('completionist snapshot refresh: feed payload was not a JSON object')
    return payload


def iter_feed_rows(payload: dict[str, Any]) -> list[tuple[str, list[Any]]]:
    rows: list[tuple[str, list[Any]]] = []
    for key, value in payload.items():
        if key in IGNORED_PAYLOAD_KEYS or not isinstance(value, list):
            continue
        rows.append((str(key), value))
    return rows


def normalize_feed_row(flight_id: str, raw_row: list[Any]) -> dict[str, Any] | None:
    latitude = as_float(raw_row[1] if len(raw_row) > 1 else None)
    longitude = as_float(raw_row[2] if len(raw_row) > 2 else None)
    if latitude is None or longitude is None:
        return None
    return {
        'flightId': flight_id,
        'aircraftHex': normalize_code(raw_row[0] if len(raw_row) > 0 else ''),
        'lat': latitude,
        'lon': longitude,
        'track': as_int(raw_row[3] if len(raw_row) > 3 else None),
        'altitude': as_int(raw_row[4] if len(raw_row) > 4 else None),
        'speed': as_int(raw_row[5] if len(raw_row) > 5 else None),
        'typeCode': normalize_code(raw_row[8] if len(raw_row) > 8 else ''),
        'registration': normalize_code(raw_row[9] if len(raw_row) > 9 else ''),
        'seenAt': as_int(raw_row[10] if len(raw_row) > 10 else None),
        'origin': normalize_code(raw_row[11] if len(raw_row) > 11 else ''),
        'destination': normalize_code(raw_row[12] if len(raw_row) > 12 else ''),
        'flightNumber': normalize_code(raw_row[13] if len(raw_row) > 13 else ''),
        'callsign': normalize_code(raw_row[16] if len(raw_row) > 16 else raw_row[13] if len(raw_row) > 13 else ''),
    }


def row_completeness(row: dict[str, Any]) -> int:
    return sum(1 for field in SNAPSHOT_FIELDS if field != 'flightId' and row.get(field) not in (None, ''))


def merge_rows(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    existing_key = (existing.get('seenAt') or -1, row_completeness(existing))
    incoming_key = (incoming.get('seenAt') or -1, row_completeness(incoming))
    primary, secondary = (incoming, existing) if incoming_key >= existing_key else (existing, incoming)
    merged = dict(primary)
    for field in SNAPSHOT_FIELDS:
        if field == 'flightId':
            continue
        if merged.get(field) in (None, ''):
            merged[field] = secondary.get(field)
    return merged


def row_to_list(row: dict[str, Any]) -> list[Any]:
    return [row.get(field) for field in SNAPSHOT_FIELDS]


def build_seed_tiles(degrees: float) -> list[FeedTile]:
    tiles: list[FeedTile] = []
    south = -90.0
    while south < 90.0:
        north = min(90.0, south + degrees)
        west = -180.0
        while west < 180.0:
            east = min(180.0, west + degrees)
            tiles.append(FeedTile(south=south, north=north, west=west, east=east))
            west = east
        south = north
    return tiles


def tile_span(tile: FeedTile) -> float:
    return max(tile.north - tile.south, tile.east - tile.west)


def can_split_tile(tile: FeedTile, min_tile_degrees: float) -> bool:
    return tile_span(tile) / 2.0 >= min_tile_degrees


def split_tile(tile: FeedTile) -> list[FeedTile]:
    mid_lat = (tile.south + tile.north) / 2.0
    mid_lon = (tile.west + tile.east) / 2.0
    return [
        FeedTile(south=mid_lat, north=tile.north, west=tile.west, east=mid_lon),
        FeedTile(south=mid_lat, north=tile.north, west=mid_lon, east=tile.east),
        FeedTile(south=tile.south, north=mid_lat, west=tile.west, east=mid_lon),
        FeedTile(south=tile.south, north=mid_lat, west=mid_lon, east=tile.east),
    ]


def format_bounds(tile: FeedTile) -> str:
    return f'{tile.north},{tile.south},{tile.west},{tile.east}'


def sweep_feed(
    feed_url: str,
    timeout_seconds: float,
    initial_tile_degrees: float,
    min_tile_degrees: float,
    max_requests: int,
    request_delay_seconds: float,
) -> tuple[dict[str, dict[str, Any]], SweepStats]:
    pending_tiles = deque(build_seed_tiles(initial_tile_degrees))
    merged_rows: dict[str, dict[str, Any]] = {}
    stats = SweepStats(seedTileCount=len(pending_tiles))

    while pending_tiles and stats.requestCount < max_requests:
        tile = pending_tiles.popleft()
        request_url = build_feed_url(feed_url, {'bounds': format_bounds(tile)})
        payload = fetch_feed(request_url, timeout_seconds)
        stats.requestCount += 1

        source_full_count = as_int(payload.get('full_count')) or 0
        stats.sourceFullCountMax = max(stats.sourceFullCountMax, source_full_count)
        version = as_int(payload.get('version'))
        if version is not None:
            stats.version = max(version, stats.version or version)

        tile_row_count = 0
        for flight_id, raw_row in iter_feed_rows(payload):
            normalized_row = normalize_feed_row(flight_id, raw_row)
            if normalized_row is None:
                stats.skippedRows += 1
                continue
            tile_row_count += 1
            existing_row = merged_rows.get(flight_id)
            if existing_row is None:
                merged_rows[flight_id] = normalized_row
                continue
            merged_rows[flight_id] = merge_rows(existing_row, normalized_row)

        if tile_row_count >= FEED_CAP_THRESHOLD:
            stats.cappedTileCount += 1
            if can_split_tile(tile, min_tile_degrees):
                child_tiles = split_tile(tile)
                stats.splitTileCount += 1
                for child_tile in reversed(child_tiles):
                    pending_tiles.appendleft(child_tile)

        if pending_tiles and stats.requestCount < max_requests and request_delay_seconds > 0:
            sleep(request_delay_seconds)

    if pending_tiles:
        stats.budgetExhausted = True

    return merged_rows, stats


def build_snapshot(
    rows_by_id: dict[str, dict[str, Any]],
    stats: SweepStats,
) -> tuple[dict[str, Any], dict[str, Any]]:
    generated_at = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    rows = [row_to_list(rows_by_id[flight_id]) for flight_id in sorted(rows_by_id)]
    snapshot = {
        'schemaVersion': 1,
        'generatedAt': generated_at,
        'fields': SNAPSHOT_FIELDS,
        'rows': rows,
    }
    manifest = {
        'schemaVersion': 1,
        'generatedAt': generated_at,
        'snapshotPath': f'./{SNAPSHOT_FILE}',
        'fields': SNAPSHOT_FIELDS,
        'rowCount': len(rows),
        'uiRefreshIntervalSeconds': 60,
        'publishIntervalSeconds': 300,
        'staleAfterSeconds': 900,
    }
    return manifest, snapshot


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Refresh the completionist-mode live flight snapshot.')
    parser.add_argument('--feed-url', default=DEFAULT_FEED_URL, help='Flight feed URL to fetch.')
    parser.add_argument('--out-dir', default=str(DEFAULT_OUT_DIR), help='Output directory for manifest and snapshot.')
    parser.add_argument('--timeout', type=float, default=25.0, help='HTTP timeout in seconds.')
    parser.add_argument(
        '--initial-tile-degrees',
        type=float,
        default=DEFAULT_INITIAL_TILE_DEGREES,
        help='Seed world coverage with tiles of this size before splitting capped tiles.',
    )
    parser.add_argument(
        '--min-tile-degrees',
        type=float,
        default=DEFAULT_MIN_TILE_DEGREES,
        help='Do not split capped tiles smaller than this size.',
    )
    parser.add_argument(
        '--max-requests',
        type=int,
        default=DEFAULT_MAX_REQUESTS,
        help='Maximum number of feed requests to use for one sweep.',
    )
    parser.add_argument(
        '--request-delay',
        type=float,
        default=DEFAULT_REQUEST_DELAY_SECONDS,
        help='Delay between tile requests in seconds.',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.initial_tile_degrees <= 0:
        raise SystemExit('completionist snapshot refresh: --initial-tile-degrees must be greater than 0')
    if args.min_tile_degrees <= 0:
        raise SystemExit('completionist snapshot refresh: --min-tile-degrees must be greater than 0')
    if args.initial_tile_degrees < args.min_tile_degrees:
        raise SystemExit('completionist snapshot refresh: --initial-tile-degrees must be >= --min-tile-degrees')
    if args.max_requests < 1:
        raise SystemExit('completionist snapshot refresh: --max-requests must be at least 1')
    if args.request_delay < 0:
        raise SystemExit('completionist snapshot refresh: --request-delay must be >= 0')

    out_dir = Path(args.out_dir)
    rows_by_id, stats = sweep_feed(
        args.feed_url,
        args.timeout,
        args.initial_tile_degrees,
        args.min_tile_degrees,
        args.max_requests,
        args.request_delay,
    )
    manifest, snapshot = build_snapshot(
        rows_by_id,
        stats,
    )
    manifest_path = out_dir / MANIFEST_FILE
    snapshot_path = out_dir / SNAPSHOT_FILE
    write_json(manifest_path, manifest)
    write_json(snapshot_path, snapshot)
    print(
        'completionist snapshot:',
        f'rows={manifest["rowCount"]}',
        f'full_count={max(manifest["rowCount"], stats.sourceFullCountMax)}',
        f'skipped={stats.skippedRows}',
        f'requests={stats.requestCount}',
        f'capped_tiles={stats.cappedTileCount}',
        f'split_tiles={stats.splitTileCount}',
        f'budget_exhausted={stats.budgetExhausted}',
        f'manifest={manifest_path}',
        f'snapshot={snapshot_path}',
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
