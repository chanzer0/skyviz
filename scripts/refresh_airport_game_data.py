from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = 'https://davidmegginson.github.io/ourairports-data'
DEFAULT_TIMEOUT_SECONDS = 60
SOURCE_PAGE_URL = 'https://ourairports.com/data/'
DAILY_GAME_DATASET_FILE = 'daily-game.json'
MANIFEST_FILE = 'manifest.json'
AIRPORT_DATA_FILES = (
    'airports.csv',
    'airport-comments.csv',
    'airport-frequencies.csv',
    'countries.csv',
    'navaids.csv',
    'regions.csv',
    'runways.csv',
)
ELIGIBLE_AIRPORT_TYPES = {'large_airport', 'medium_airport', 'small_airport'}
SURFACE_PAVED_PREFIXES = ('ASP', 'ASPH', 'CON', 'CONC', 'BIT', 'PEM', 'PAV', 'MAC')
SURFACE_UNPAVED_PREFIXES = ('TURF', 'GR', 'DIRT', 'SAND', 'CLAY', 'EARTH', 'SOIL', 'SNOW', 'ICE')
RUNWAY_LAYOUT_LABELS = {
    'single': 'Single runway',
    'parallel': 'Parallel runways',
    'intersecting': 'Intersecting runways',
    'water': 'Water runway',
    'mixed': 'Mixed layout',
    'unknown': 'Unknown layout',
}
SURFACE_FAMILY_LABELS = {
    'paved': 'Mostly paved',
    'unpaved': 'Mostly unpaved',
    'water': 'Water surface',
    'mixed': 'Mixed surfaces',
    'unknown': 'Unknown surface',
}
TARGET_TIER_LABELS = {
    'hub': 'Hub',
    'regional': 'Regional',
    'frontier': 'Frontier',
}
CONTINENT_LABELS = {
    'AF': 'Africa',
    'AN': 'Antarctica',
    'AS': 'Asia',
    'EU': 'Europe',
    'NA': 'North America',
    'OC': 'Oceania',
    'SA': 'South America',
}
DEFAULT_MAX_GUESSES = 8
COMMENT_HINT_LIMIT = 4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def sanitize_text(value: object) -> str:
    return ' '.join(str(value or '').replace('\u00a0', ' ').split())


def normalize_code(value: object) -> str:
    return sanitize_text(value).upper()


def normalize_key(value: object) -> str:
    return sanitize_text(value).lower()


def parse_int(value: object) -> int | None:
    text = sanitize_text(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def parse_float(value: object) -> float | None:
    text = sanitize_text(value)
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def download_file(base_url: str, file_name: str, destination: Path, timeout_seconds: int) -> int:
    url = f"{base_url.rstrip('/')}/{file_name}"
    request = Request(url, headers={'Accept': 'text/csv,application/octet-stream;q=0.9,*/*;q=0.8'})
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(request, timeout=timeout_seconds) as response:
        content = response.read()
    destination.write_bytes(content)
    return len(content)


def read_csv_rows(path: Path, *, skipinitialspace: bool = False) -> list[dict[str, str]]:
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle, skipinitialspace=skipinitialspace)
        return [dict(row) for row in reader]


def build_country_lookup(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    lookup: dict[str, dict[str, str]] = {}
    for row in rows:
        code = normalize_code(row.get('code'))
        if not code:
            continue
        lookup[code] = {
            'code': code,
            'name': sanitize_text(row.get('name')) or code,
            'continent': normalize_code(row.get('continent')),
        }
    return lookup


def build_region_lookup(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    lookup: dict[str, dict[str, str]] = {}
    for row in rows:
        code = normalize_code(row.get('code'))
        if not code:
            continue
        lookup[code] = {
            'code': code,
            'name': sanitize_text(row.get('name')) or code,
            'country_code': normalize_code(row.get('iso_country')),
        }
    return lookup


def classify_surface_family(surface_codes: set[str]) -> str:
    if not surface_codes:
        return 'unknown'
    families = set()
    for code in surface_codes:
        upper_code = normalize_code(code)
        if not upper_code:
            continue
        if upper_code.startswith('WATER'):
            families.add('water')
            continue
        if upper_code.startswith(SURFACE_PAVED_PREFIXES):
            families.add('paved')
            continue
        if upper_code.startswith(SURFACE_UNPAVED_PREFIXES):
            families.add('unpaved')
            continue
        families.add('mixed')
    if len(families) == 1:
        return next(iter(families))
    if families == {'paved', 'unpaved'}:
        return 'mixed'
    if 'water' in families and len(families) > 1:
        return 'mixed'
    return 'mixed'


def runway_heading_bucket(runway_row: dict[str, str]) -> int | None:
    for key in ('le_heading_degT', 'he_heading_degT'):
        heading = parse_float(runway_row.get(key))
        if heading is not None:
            normalized = heading % 180
            return int(round(normalized / 10.0) * 10) % 180
    for key in ('le_ident', 'he_ident'):
        ident = normalize_code(runway_row.get(key))
        match = re.match(r'^(\d{1,2})[A-Z]?$', ident)
        if not match:
            continue
        number = int(match.group(1))
        return (number * 10) % 180
    return None


def build_runway_index(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    by_airport: dict[str, dict[str, object]] = defaultdict(
        lambda: {
            'runway_count': 0,
            'longest_runway_ft': None,
            'surface_codes': set(),
            'heading_buckets': [],
        }
    )
    for row in rows:
        airport_ref = sanitize_text(row.get('airport_ref'))
        if not airport_ref:
            continue
        bucket = by_airport[airport_ref]
        bucket['runway_count'] += 1
        runway_length = parse_int(row.get('length_ft'))
        if runway_length is not None:
            longest = bucket['longest_runway_ft']
            bucket['longest_runway_ft'] = runway_length if longest is None else max(longest, runway_length)
        surface = sanitize_text(row.get('surface'))
        if surface:
            bucket['surface_codes'].add(surface)
        heading_bucket = runway_heading_bucket(row)
        if heading_bucket is not None:
            bucket['heading_buckets'].append(heading_bucket)

    finalized: dict[str, dict[str, object]] = {}
    for airport_ref, bucket in by_airport.items():
        headings = sorted(set(bucket['heading_buckets']))
        surface_family = classify_surface_family(bucket['surface_codes'])
        runway_count = int(bucket['runway_count'])
        if surface_family == 'water' and runway_count >= 1:
            runway_layout = 'water'
        elif runway_count <= 1:
            runway_layout = 'single'
        elif len(headings) <= 1:
            runway_layout = 'parallel'
        else:
            heading_spread = max(
                min(abs(left - right), 180 - abs(left - right))
                for index, left in enumerate(headings)
                for right in headings[index + 1:]
            )
            runway_layout = 'intersecting' if heading_spread >= 35 else 'mixed'
        finalized[airport_ref] = {
            'runway_count': runway_count,
            'longest_runway_ft': bucket['longest_runway_ft'],
            'surface_family': surface_family,
            'surface_label': SURFACE_FAMILY_LABELS[surface_family],
            'runway_layout': runway_layout,
            'runway_layout_label': RUNWAY_LAYOUT_LABELS[runway_layout],
        }
    return finalized


def build_frequency_index(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    by_airport: dict[str, dict[str, object]] = defaultdict(
        lambda: {
            'frequency_count': 0,
            'frequency_types': Counter(),
        }
    )
    for row in rows:
        airport_ref = sanitize_text(row.get('airport_ref'))
        if not airport_ref:
            continue
        bucket = by_airport[airport_ref]
        bucket['frequency_count'] += 1
        frequency_type = normalize_code(row.get('type'))
        if frequency_type:
            bucket['frequency_types'][frequency_type] += 1
    finalized: dict[str, dict[str, object]] = {}
    for airport_ref, bucket in by_airport.items():
        finalized[airport_ref] = {
            'frequency_count': int(bucket['frequency_count']),
            'frequency_types': [item[0] for item in bucket['frequency_types'].most_common(3)],
        }
    return finalized


def build_comment_index(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    by_airport: dict[str, dict[str, object]] = defaultdict(
        lambda: {
            'comment_count': 0,
            'comments': [],
        }
    )
    for index, row in enumerate(rows):
        airport_ref = sanitize_text(row.get('airportRef'))
        if not airport_ref:
            continue
        bucket = by_airport[airport_ref]
        bucket['comment_count'] += 1
        subject = sanitize_text(row.get('subject'))[:100]
        body = sanitize_text(row.get('body'))
        snippet_source = body or subject
        if not snippet_source:
            continue
        bucket['comments'].append(
            {
                'date': sanitize_text(row.get('date')),
                'subject': subject,
                'snippet': snippet_source[:180],
                'order': index,
            }
        )
    finalized: dict[str, dict[str, object]] = {}
    for airport_ref, bucket in by_airport.items():
        comments = sorted(
            bucket['comments'],
            key=lambda entry: (str(entry.get('date') or ''), int(entry.get('order') or 0)),
            reverse=True,
        )[:COMMENT_HINT_LIMIT]
        latest_comment = comments[0] if comments else {}
        finalized[airport_ref] = {
            'comment_count': int(bucket['comment_count']),
            'comment_subject': str(latest_comment.get('subject') or ''),
            'comment_snippet': str(latest_comment.get('snippet') or ''),
            'comments': [
                {
                    'date': str(comment.get('date') or ''),
                    'subject': str(comment.get('subject') or ''),
                    'snippet': str(comment.get('snippet') or ''),
                }
                for comment in comments
            ],
        }
    return finalized


def build_navaid_index(rows: list[dict[str, str]], airport_ident_to_id: dict[str, str]) -> dict[str, dict[str, object]]:
    by_airport: dict[str, dict[str, object]] = defaultdict(
        lambda: {
            'navaid_count': 0,
            'navaid_types': Counter(),
        }
    )
    for row in rows:
        associated_airport = normalize_code(row.get('associated_airport'))
        if not associated_airport:
            continue
        airport_id = airport_ident_to_id.get(associated_airport)
        if not airport_id:
            continue
        bucket = by_airport[airport_id]
        bucket['navaid_count'] += 1
        navaid_type = normalize_code(row.get('type'))
        if navaid_type:
            bucket['navaid_types'][navaid_type] += 1
    finalized: dict[str, dict[str, object]] = {}
    for airport_id, bucket in by_airport.items():
        finalized[airport_id] = {
            'navaid_count': int(bucket['navaid_count']),
            'navaid_types': [item[0] for item in bucket['navaid_types'].most_common(3)],
        }
    return finalized


def airport_size_bucket(airport_type: str) -> str:
    normalized_type = normalize_key(airport_type)
    if normalized_type.startswith('large'):
        return 'large'
    if normalized_type.startswith('medium'):
        return 'medium'
    return 'small'


def determine_target_tier(airport_type: str, scheduled_service: bool, has_iata: bool, runway_count: int, navaid_count: int) -> str:
    size_bucket = airport_size_bucket(airport_type)
    if size_bucket == 'large':
        return 'hub'
    if size_bucket == 'medium':
        if scheduled_service and has_iata:
            return 'hub'
        if runway_count >= 3 or navaid_count >= 2:
            return 'hub'
        return 'regional'
    if scheduled_service and has_iata:
        return 'regional'
    if has_iata and (runway_count >= 1 or navaid_count >= 1):
        return 'regional'
    return 'frontier'


def build_airport_records(csv_dir: Path) -> tuple[list[dict[str, object]], dict[str, object]]:
    countries = build_country_lookup(read_csv_rows(csv_dir / 'countries.csv'))
    regions = build_region_lookup(read_csv_rows(csv_dir / 'regions.csv'))
    airport_rows = read_csv_rows(csv_dir / 'airports.csv')
    runway_index = build_runway_index(read_csv_rows(csv_dir / 'runways.csv'))
    frequency_index = build_frequency_index(read_csv_rows(csv_dir / 'airport-frequencies.csv'))
    comment_index = build_comment_index(read_csv_rows(csv_dir / 'airport-comments.csv', skipinitialspace=True))

    airport_ident_to_id: dict[str, str] = {}
    for row in airport_rows:
        airport_id = sanitize_text(row.get('id'))
        ident = normalize_code(row.get('ident'))
        if airport_id and ident:
            airport_ident_to_id[ident] = airport_id
        gps_code = normalize_code(row.get('gps_code'))
        if airport_id and gps_code:
            airport_ident_to_id[gps_code] = airport_id
        icao_code = normalize_code(row.get('icao_code'))
        if airport_id and icao_code:
            airport_ident_to_id[icao_code] = airport_id
    navaid_index = build_navaid_index(read_csv_rows(csv_dir / 'navaids.csv'), airport_ident_to_id)

    records: list[dict[str, object]] = []
    type_counts: Counter[str] = Counter()
    target_tier_counts: Counter[str] = Counter()
    continent_counts: Counter[str] = Counter()

    for row in airport_rows:
        airport_type = normalize_key(row.get('type'))
        if airport_type not in ELIGIBLE_AIRPORT_TYPES:
            continue
        latitude = parse_float(row.get('latitude_deg'))
        longitude = parse_float(row.get('longitude_deg'))
        if latitude is None or longitude is None:
            continue

        airport_id = sanitize_text(row.get('id'))
        ident = normalize_code(row.get('ident'))
        name = sanitize_text(row.get('name'))
        if not airport_id or not ident or not name:
            continue

        iata_code = normalize_code(row.get('iata_code'))
        gps_code = normalize_code(row.get('gps_code'))
        icao_code = normalize_code(row.get('icao_code'))
        municipality = sanitize_text(row.get('municipality'))
        scheduled_service = normalize_key(row.get('scheduled_service')) == 'yes'
        has_iata = bool(iata_code)

        iso_country = normalize_code(row.get('iso_country'))
        iso_region = normalize_code(row.get('iso_region'))
        continent = normalize_code(row.get('continent')) or countries.get(iso_country, {}).get('continent', 'unknown')
        country_name = countries.get(iso_country, {}).get('name', iso_country or 'Unknown')
        region_name = regions.get(iso_region, {}).get('name', iso_region or 'Unknown')
        elevation_ft = parse_int(row.get('elevation_ft'))

        runway_details = runway_index.get(
            airport_id,
            {
                'runway_count': 0,
                'longest_runway_ft': None,
                'surface_family': 'unknown',
                'surface_label': SURFACE_FAMILY_LABELS['unknown'],
                'runway_layout': 'unknown',
                'runway_layout_label': RUNWAY_LAYOUT_LABELS['unknown'],
            },
        )
        frequency_details = frequency_index.get(
            airport_id,
            {
                'frequency_count': 0,
                'frequency_types': [],
            },
        )
        frequency_count = int(frequency_details['frequency_count'])
        if airport_type == 'small_airport' and not (has_iata and frequency_count >= 3):
            continue
        comment_details = comment_index.get(
            airport_id,
            {
                'comment_count': 0,
                'comment_subject': '',
                'comment_snippet': '',
            },
        )
        navaid_details = navaid_index.get(
            airport_id,
            {
                'navaid_count': 0,
                'navaid_types': [],
            },
        )

        target_tier = determine_target_tier(
            airport_type,
            scheduled_service,
            has_iata,
            int(runway_details['runway_count']),
            int(navaid_details['navaid_count']),
        )
        display_codes = [code for code in (iata_code, icao_code, gps_code, ident) if code]
        display_code = next(iter(dict.fromkeys(display_codes)), ident)
        label_parts = [name]
        if municipality:
            label_parts.append(municipality)
        if country_name:
            label_parts.append(country_name)
        search_text = ' '.join(
            part
            for part in (
                ident,
                iata_code,
                icao_code,
                gps_code,
                name,
                municipality,
                country_name,
                region_name,
                sanitize_text(row.get('keywords')),
                comment_details['comment_subject'],
            )
            if part
        ).lower()

        record = {
            'id': airport_id,
            'ident': ident,
            'displayCode': display_code,
            'iataCode': iata_code,
            'icaoCode': icao_code,
            'gpsCode': gps_code,
            'name': name,
            'municipality': municipality,
            'type': airport_type,
            'sizeBucket': airport_size_bucket(airport_type),
            'scheduledService': scheduled_service,
            'continent': continent or 'unknown',
            'continentLabel': CONTINENT_LABELS.get(continent, continent or 'Unknown'),
            'countryCode': iso_country or 'unknown',
            'countryName': country_name,
            'regionCode': iso_region or 'unknown',
            'regionName': region_name,
            'elevationFt': elevation_ft,
            'latitude': round(latitude, 6),
            'longitude': round(longitude, 6),
            'runwayCount': int(runway_details['runway_count']),
            'longestRunwayFt': runway_details['longest_runway_ft'],
            'runwayLayout': runway_details['runway_layout'],
            'runwayLayoutLabel': runway_details['runway_layout_label'],
            'surfaceFamily': runway_details['surface_family'],
            'surfaceLabel': runway_details['surface_label'],
            'navaidCount': int(navaid_details['navaid_count']),
            'navaidTypes': list(navaid_details['navaid_types']),
            'frequencyCount': frequency_count,
            'frequencyTypes': list(frequency_details['frequency_types']),
            'commentCount': int(comment_details['comment_count']),
            'commentSubject': comment_details['comment_subject'],
            'commentSnippet': comment_details['comment_snippet'],
            'comments': list(comment_details.get('comments') or []),
            'targetTier': target_tier,
            'targetTierLabel': TARGET_TIER_LABELS[target_tier],
            'searchText': search_text,
            'searchLabel': ' · '.join(label_parts),
        }
        records.append(record)
        type_counts[airport_type] += 1
        target_tier_counts[target_tier] += 1
        continent_counts[record['continent']] += 1

    records.sort(
        key=lambda row: (
            str(row['countryName']),
            str(row['municipality']),
            str(row['name']),
            str(row['ident']),
        )
    )
    stats = {
        'guessableAirports': len(records),
        'typeCounts': dict(sorted(type_counts.items())),
        'targetTierCounts': dict(sorted(target_tier_counts.items())),
        'continentCounts': dict(sorted(continent_counts.items())),
    }
    return records, stats


def build_manifest(base_url: str, csv_dir: Path, stats: dict[str, object]) -> dict[str, object]:
    datasets: dict[str, dict[str, object]] = {}
    for file_name in AIRPORT_DATA_FILES + (DAILY_GAME_DATASET_FILE,):
        path = csv_dir / file_name
        if not path.exists():
            continue
        datasets[file_name] = {
            'path': f'./{file_name}',
            'url': f"{base_url.rstrip('/')}/{file_name}" if file_name.endswith('.csv') else '',
            'sizeBytes': path.stat().st_size,
        }
    return {
        'source': 'OurAirports Open Data',
        'sourcePage': SOURCE_PAGE_URL,
        'baseUrl': base_url,
        'generatedAt': utc_now_iso(),
        'dailyDataPath': f'./{DAILY_GAME_DATASET_FILE}',
        'maxGuesses': DEFAULT_MAX_GUESSES,
        'guessableAirports': stats['guessableAirports'],
        'targetTierCounts': stats['targetTierCounts'],
        'datasets': datasets,
    }


def build_payload(base_url: str, records: list[dict[str, object]], stats: dict[str, object]) -> dict[str, object]:
    return {
        'source': 'OurAirports Open Data',
        'sourcePage': SOURCE_PAGE_URL,
        'baseUrl': base_url,
        'generatedAt': utc_now_iso(),
        'maxGuesses': DEFAULT_MAX_GUESSES,
        'stats': stats,
        'airports': records,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Refresh local OurAirports CSV snapshots and build the Skyviz daily airport game dataset.',
    )
    parser.add_argument(
        '--base-url',
        default=DEFAULT_BASE_URL,
        help='Base URL for the OurAirports CSV files.',
    )
    parser.add_argument(
        '--csv-dir',
        default='site/data/airports',
        help='Directory for the downloaded airport CSV files and generated game artifacts.',
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help='Request timeout in seconds.',
    )
    parser.add_argument(
        '--download-only',
        action='store_true',
        help='Download the CSV snapshots without rebuilding the derived daily game JSON.',
    )
    parser.add_argument(
        '--build-only',
        action='store_true',
        help='Rebuild the derived daily game JSON from local CSV snapshots without downloading again.',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.download_only and args.build_only:
        raise SystemExit('choose either --download-only or --build-only, not both')

    csv_dir = Path(args.csv_dir)
    csv_dir.mkdir(parents=True, exist_ok=True)

    if not args.build_only:
        for file_name in AIRPORT_DATA_FILES:
            destination = csv_dir / file_name
            byte_count = download_file(args.base_url, file_name, destination, args.timeout)
            print(f"downloaded {file_name}: bytes={byte_count}")

    if args.download_only:
        return 0

    missing_files = [file_name for file_name in AIRPORT_DATA_FILES if not (csv_dir / file_name).exists()]
    if missing_files:
        raise SystemExit(f'missing required airport CSV files: {", ".join(sorted(missing_files))}')

    records, stats = build_airport_records(csv_dir)
    if not records:
        raise SystemExit('no guessable airports were produced from the airport CSV snapshots')

    payload = build_payload(args.base_url, records, stats)
    manifest = build_manifest(args.base_url, csv_dir, stats)
    write_json(csv_dir / DAILY_GAME_DATASET_FILE, payload)
    write_json(csv_dir / MANIFEST_FILE, manifest)
    print(
        'built daily airport game dataset:',
        f"airports={stats['guessableAirports']}",
        f"hub={stats['targetTierCounts'].get('hub', 0)}",
        f"regional={stats['targetTierCounts'].get('regional', 0)}",
        f"frontier={stats['targetTierCounts'].get('frontier', 0)}",
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
