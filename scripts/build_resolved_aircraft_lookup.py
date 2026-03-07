from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_BASE_LOOKUP_PATH = Path('site/data/reference/aircraft_lookup.json')
DEFAULT_INFERRED_PATH = Path('output/inferred_aircraft_type_mappings.json')
DEFAULT_MODELS_PATH = Path('site/data/reference/models.json')
DEFAULT_OUT_PATH = Path('site/data/reference/aircraft_lookup_resolved.json')


def normalize_code(value: object) -> str:
    return str(value or '').strip().upper()


def normalize_reg(value: object) -> str:
    return ''.join(char for char in str(value or '').upper().strip() if char.isalnum())


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def load_json(path: Path) -> object:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def load_model_ids(models_path: Path) -> set[str]:
    payload = load_json(models_path)
    rows = payload.get('rows')
    if not isinstance(rows, list):
        raise ValueError(f'{models_path} has no rows list')
    return {
        normalize_code(row.get('id'))
        for row in rows
        if isinstance(row, dict) and normalize_code(row.get('id'))
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Merge high-confidence inferred rows into a consumable resolved aircraft lookup.',
    )
    parser.add_argument(
        '--base-lookup-path',
        default=str(DEFAULT_BASE_LOOKUP_PATH),
        help='Path to base aircraft lookup JSON.',
    )
    parser.add_argument(
        '--inferred-path',
        default=str(DEFAULT_INFERRED_PATH),
        help='Path to inferred mapping artifact JSON.',
    )
    parser.add_argument(
        '--models-path',
        default=str(DEFAULT_MODELS_PATH),
        help='Path to models reference JSON.',
    )
    parser.add_argument(
        '--out-path',
        default=str(DEFAULT_OUT_PATH),
        help='Output path for resolved lookup JSON.',
    )
    parser.add_argument(
        '--include-medium',
        action='store_true',
        help='Include inferred_medium_confidence rows in addition to inferred_high_confidence.',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_lookup_path = Path(args.base_lookup_path)
    inferred_path = Path(args.inferred_path)
    models_path = Path(args.models_path)
    out_path = Path(args.out_path)

    if not base_lookup_path.exists():
        raise SystemExit(f'base lookup not found: {base_lookup_path}')
    if not inferred_path.exists():
        raise SystemExit(f'inferred artifact not found: {inferred_path}')
    if not models_path.exists():
        raise SystemExit(f'models reference not found: {models_path}')

    valid_model_ids = load_model_ids(models_path)

    base_payload = load_json(base_lookup_path)
    if not isinstance(base_payload, dict):
        raise SystemExit(f'base lookup is not a JSON object: {base_lookup_path}')
    inferred_payload = load_json(inferred_path)
    if not isinstance(inferred_payload, dict):
        raise SystemExit(f'inferred payload is not a JSON object: {inferred_path}')

    base_hex_rows = base_payload.get('byAircraftHex')
    base_reg_rows = base_payload.get('byRegistration')
    if not isinstance(base_hex_rows, dict):
        base_hex_rows = {}
    if not isinstance(base_reg_rows, dict):
        base_reg_rows = {}

    merged_hex: dict[str, str] = {
        normalize_code(key): normalize_code(value)
        for key, value in base_hex_rows.items()
        if normalize_code(key) and normalize_code(value)
    }
    merged_reg: dict[str, str] = {
        normalize_reg(key): normalize_code(value)
        for key, value in base_reg_rows.items()
        if normalize_reg(key) and normalize_code(value)
    }

    accepted_statuses = {'inferred_high_confidence'}
    if args.include_medium:
        accepted_statuses.add('inferred_medium_confidence')

    rows = inferred_payload.get('rows')
    if not isinstance(rows, list):
        raise SystemExit(f'inferred payload missing rows list: {inferred_path}')

    inference_considered = 0
    added_hex = 0
    added_reg = 0
    skipped_invalid = 0
    skipped_missing_type = 0
    skipped_status = 0
    skipped_conflict = 0
    conflicts: list[dict[str, str]] = []

    for row in rows:
        if not isinstance(row, dict):
            continue
        status = normalize_code(row.get('status')).lower()
        if status not in accepted_statuses:
            skipped_status += 1
            continue
        inference_considered += 1

        type_code = normalize_code(row.get('resolvedTypeCode'))
        if not type_code or type_code not in valid_model_ids:
            skipped_missing_type += 1
            continue

        aircraft_hex = normalize_code(row.get('aircraftHex'))
        registration = normalize_reg(row.get('registration') or row.get('registrationRaw'))

        added_this_row = False
        if aircraft_hex:
            if len(aircraft_hex) > 6:
                skipped_invalid += 1
            else:
                existing = merged_hex.get(aircraft_hex)
                if existing and existing != type_code:
                    skipped_conflict += 1
                    if len(conflicts) < 200:
                        conflicts.append(
                            {
                                'kind': 'hex',
                                'key': aircraft_hex,
                                'existingTypeCode': existing,
                                'inferredTypeCode': type_code,
                                'registration': registration,
                                'status': status,
                            }
                        )
                else:
                    if not existing:
                        added_hex += 1
                        added_this_row = True
                    merged_hex[aircraft_hex] = type_code

        if registration:
            existing_reg = merged_reg.get(registration)
            if existing_reg and existing_reg != type_code:
                skipped_conflict += 1
                if len(conflicts) < 200:
                    conflicts.append(
                        {
                            'kind': 'registration',
                            'key': registration,
                            'existingTypeCode': existing_reg,
                            'inferredTypeCode': type_code,
                            'aircraftHex': aircraft_hex,
                            'status': status,
                        }
                    )
            else:
                if not existing_reg:
                    added_reg += 1
                    added_this_row = True
                merged_reg[registration] = type_code

        if not added_this_row and not aircraft_hex and not registration:
            skipped_invalid += 1

    summary = {
        'baseHexRows': len(base_hex_rows),
        'baseRegistrationRows': len(base_reg_rows),
        'inferenceRowsConsidered': inference_considered,
        'addedHexRows': added_hex,
        'addedRegistrationRows': added_reg,
        'skippedStatusRows': skipped_status,
        'skippedMissingTypeRows': skipped_missing_type,
        'skippedInvalidRows': skipped_invalid,
        'skippedConflictRows': skipped_conflict,
        'mergedHexRows': len(merged_hex),
        'mergedRegistrationRows': len(merged_reg),
    }

    payload = {
        'source': 'Skyviz resolved lookup',
        'generatedAt': utc_now_iso(),
        'generatedFrom': {
            'baseLookupPath': str(base_lookup_path),
            'inferredPath': str(inferred_path),
            'modelsPath': str(models_path),
        },
        'acceptedStatuses': sorted(accepted_statuses),
        'summary': summary,
        'byAircraftHex': dict(sorted(merged_hex.items())),
        'byRegistration': dict(sorted(merged_reg.items())),
        'conflictsSample': conflicts,
    }
    write_json(out_path, payload)

    print(
        'resolved lookup built:',
        f"hex_rows={summary['mergedHexRows']}",
        f"reg_rows={summary['mergedRegistrationRows']}",
        f"added_hex={added_hex}",
        f"added_reg={added_reg}",
        f"conflicts={skipped_conflict}",
    )
    print(f'wrote {out_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
