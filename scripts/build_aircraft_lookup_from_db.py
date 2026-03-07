from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_DB_PATH = Path('aircraft_data.db')
DEFAULT_TABLE = 'aircraft_database_sheet1'
DEFAULT_OUT_PATH = Path('site/data/reference/aircraft_lookup.json')


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def normalize_hex(value: object) -> str:
    return str(value or '').strip().upper()


def normalize_reg(value: object) -> str:
    text = str(value or '').strip().upper()
    return ''.join(char for char in text if char.isalnum())


def normalize_model_id(value: object) -> str:
    return str(value or '').strip().upper()


def pick_mode(counter: Counter[str]) -> str:
    if not counter:
        return ''
    return sorted(counter.items(), key=lambda row: (-row[1], row[0]))[0][0]


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Build aircraft lookup JSON from aircraft_data.db for aircraftId/reg -> modelId mapping.',
    )
    parser.add_argument(
        '--db-path',
        default=str(DEFAULT_DB_PATH),
        help='Path to aircraft_data.db.',
    )
    parser.add_argument(
        '--table',
        default=DEFAULT_TABLE,
        help='SQLite table to read (default: aircraft_database_sheet1).',
    )
    parser.add_argument(
        '--out',
        default=str(DEFAULT_OUT_PATH),
        help='Output JSON path.',
    )
    parser.add_argument(
        '--include-registration-map',
        action='store_true',
        help='Also include a normalized reg -> modelId map (larger file).',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    db_path = Path(args.db_path)
    out_path = Path(args.out)
    include_registration_map = bool(args.include_registration_map)

    if not db_path.exists():
        raise SystemExit(f'database not found: {db_path}')

    by_hex_counts: dict[str, Counter[str]] = defaultdict(Counter)
    by_reg_counts: dict[str, Counter[str]] = defaultdict(Counter)
    scanned_rows = 0
    rows_with_hex = 0
    rows_with_model = 0

    connection = sqlite3.connect(str(db_path))
    try:
        cursor = connection.cursor()
        cursor.execute(f'SELECT icao, reg, icaotype FROM [{args.table}]')
        for raw_hex, raw_reg, raw_model in cursor:
            scanned_rows += 1
            aircraft_hex = normalize_hex(raw_hex)
            model_id = normalize_model_id(raw_model)
            if aircraft_hex:
                rows_with_hex += 1
            if model_id:
                rows_with_model += 1
            if not aircraft_hex or not model_id:
                continue
            by_hex_counts[aircraft_hex][model_id] += 1
            if include_registration_map:
                reg = normalize_reg(raw_reg)
                if reg:
                    by_reg_counts[reg][model_id] += 1
    finally:
        connection.close()

    by_aircraft_hex = {
        aircraft_hex: pick_mode(model_counter)
        for aircraft_hex, model_counter in by_hex_counts.items()
        if model_counter
    }

    payload = {
        'source': str(db_path.name),
        'table': args.table,
        'generatedAt': utc_now_iso(),
        'scannedRows': scanned_rows,
        'rowsWithHex': rows_with_hex,
        'rowsWithModelId': rows_with_model,
        'byAircraftHexRows': len(by_aircraft_hex),
        'byAircraftHex': dict(sorted(by_aircraft_hex.items())),
    }

    if include_registration_map:
        by_registration = {
            reg: pick_mode(model_counter)
            for reg, model_counter in by_reg_counts.items()
            if model_counter
        }
        payload['byRegistrationRows'] = len(by_registration)
        payload['byRegistration'] = dict(sorted(by_registration.items()))

    write_json(out_path, payload)

    print(
        'aircraft lookup built:',
        f'scanned={scanned_rows}',
        f'hex_rows={len(by_aircraft_hex)}',
        f'reg_rows={payload.get("byRegistrationRows", 0)}',
    )
    print(f'wrote {out_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
