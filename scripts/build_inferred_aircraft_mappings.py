from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_EXPORT_PATH = Path('skycards_user.json')
DEFAULT_DB_PATH = Path('aircraft_data.db')
DEFAULT_MODELS_PATH = Path('site/data/reference/models.json')
DEFAULT_LOOKUP_PATH = Path('site/data/reference/aircraft_lookup.json')
DEFAULT_OUT_JSON = Path('output/inferred_aircraft_type_mappings.json')
DEFAULT_OUT_REVIEW = Path('output/inferred_aircraft_type_mappings_review.md')


SOURCE_PRIORITY = [
    'hex_db',
    'reg_db',
    'reg_fleet',
    'manufacturer_model_infer',
    'model_only_infer',
]

SOURCE_WEIGHT = {
    'hex_db': 1.00,
    'reg_db': 0.82,
    'reg_fleet': 0.74,
    'manufacturer_model_infer': 0.68,
    'model_only_infer': 0.58,
}

METHOD_BASE_CONFIDENCE = {
    'hex_db': 0.97,
    'reg_db': 0.90,
    'reg_fleet': 0.84,
    'manufacturer_model_infer': 0.76,
    'model_only_infer': 0.68,
    'unknown': 0.60,
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def normalize_code(value: object) -> str:
    return str(value or '').strip().upper()


def normalize_reg(value: object) -> str:
    return ''.join(char for char in str(value or '').upper().strip() if char.isalnum())


def normalize_text(value: object) -> str:
    return ' '.join(str(value or '').upper().strip().split())


def aircraft_id_to_hex(value: object) -> str:
    if value in (None, ''):
        return ''
    try:
        number = int(value)
    except (TypeError, ValueError):
        return ''
    if number < 0:
        return ''
    hex_value = format(number, 'X')
    return hex_value.rjust(6, '0') if len(hex_value) < 6 else hex_value


def build_external_hints(registration: str) -> list[str]:
    if not registration:
        return []
    return [
        f'https://www.flightradar24.com/data/aircraft/{registration.lower()}',
        f'https://flightaware.com/live/flight/{registration.upper()}',
        f'https://globe.adsbexchange.com/?reg={registration.upper()}',
    ]


def load_model_ids(models_path: Path) -> set[str]:
    with models_path.open('r', encoding='utf-8') as handle:
        payload = json.load(handle)
    rows = payload.get('rows')
    if not isinstance(rows, list):
        raise ValueError(f'{models_path} has no rows list')
    return {
        normalize_code(row.get('id'))
        for row in rows
        if isinstance(row, dict) and normalize_code(row.get('id'))
    }


def load_base_lookup(lookup_path: Path) -> dict[str, str]:
    if not lookup_path.exists():
        return {}
    with lookup_path.open('r', encoding='utf-8') as handle:
        payload = json.load(handle)
    rows = payload.get('byAircraftHex')
    if not isinstance(rows, dict):
        return {}
    return {
        normalize_code(key): normalize_code(value)
        for key, value in rows.items()
        if normalize_code(key) and normalize_code(value)
    }


def load_unique_export_rows(export_path: Path) -> list[dict]:
    with export_path.open('r', encoding='utf-8') as handle:
        payload = json.load(handle)
    rows = payload.get('caughtRegistrations')
    if not isinstance(rows, list):
        rows = payload.get('uniqueRegs')
    if not isinstance(rows, list):
        raise ValueError(f'{export_path} has neither caughtRegistrations[] nor uniqueRegs[]')

    unique_rows = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        registration_raw = str(row.get('reg') or '').strip()
        registration = normalize_reg(registration_raw)
        aircraft_id = row.get('aircraftId')
        aircraft_hex = aircraft_id_to_hex(aircraft_id)
        dedupe_key = (aircraft_hex, registration)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        unique_rows.append(
            {
                'registrationRaw': registration_raw,
                'registration': registration,
                'aircraftId': aircraft_id,
                'aircraftHex': aircraft_hex,
            }
        )
    return unique_rows


def counter_to_rows(counter: Counter[str], limit: int = 6) -> list[dict]:
    return [
        {'typeCode': code, 'count': count}
        for code, count in counter.most_common(limit)
    ]


def select_best_type(counter: Counter[str]) -> str:
    if not counter:
        return ''
    return sorted(counter.items(), key=lambda item: (-item[1], item[0]))[0][0]


def add_scored_votes(
    score_map: dict[str, float],
    source_map: dict[str, set[str]],
    source: str,
    counter: Counter[str],
    *,
    valid_model_ids: set[str],
) -> None:
    if not counter:
        return
    normalized = Counter(
        {
            normalize_code(type_code): count
            for type_code, count in counter.items()
            if normalize_code(type_code) in valid_model_ids
        }
    )
    if not normalized:
        return
    top_count = normalized.most_common(1)[0][1]
    for type_code, count in normalized.items():
        count_bonus = min(max(count - 1, 0), 4) * 0.04
        support_ratio = count / top_count if top_count else 0
        score = SOURCE_WEIGHT[source] * support_ratio + count_bonus
        score_map[type_code] = score_map.get(type_code, 0.0) + score
        source_map.setdefault(type_code, set()).add(source)


def choose_method_for_type(type_code: str, source_map: dict[str, set[str]]) -> str:
    sources = source_map.get(type_code, set())
    for source in SOURCE_PRIORITY:
        if source in sources:
            return source
    return 'unknown'


def build_review_state(status: str, confidence: float) -> str:
    if status == 'unresolved':
        return 'needs_research'
    if status == 'ambiguous':
        return 'needs_manual_review'
    if confidence >= 0.9:
        return 'auto_accept'
    if confidence >= 0.78:
        return 'review_recommended'
    return 'needs_manual_review'


def build_markdown_report(payload: dict) -> str:
    summary = payload['summary']
    lines: list[str] = []
    lines.append('# Inferred Aircraft Type Mapping Review')
    lines.append('')
    lines.append(f"- Generated: `{payload['generatedAt']}`")
    lines.append(f"- Unique export rows evaluated: `{summary['uniqueExportRows']}`")
    lines.append(f"- Already mapped by base lookup: `{summary['mappedByBaseLookup']}`")
    lines.append(f"- Rows needing inference/research: `{summary['rowsNeedingInference']}`")
    lines.append('')
    lines.append('## Outcome Counts')
    lines.append('')
    for key, value in summary['statusCounts'].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.append('')
    lines.append('## Method Counts')
    lines.append('')
    for key, value in summary['methodCounts'].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.append('')
    lines.append('## High-Confidence Inferred Samples')
    lines.append('')
    high_conf = [
        row
        for row in payload['rows']
        if row['status'].startswith('inferred') and row['confidence'] >= 0.85
    ][:40]
    if not high_conf:
        lines.append('- None')
    else:
        for row in high_conf:
            lines.append(
                f"- `{row['registrationRaw'] or row['registration']}` "
                f"(id `{row['aircraftId']}`, hex `{row['aircraftHex']}`) -> "
                f"`{row['resolvedTypeCode']}` via `{row['method']}` "
                f"(confidence `{row['confidence']:.2f}`)"
            )
    lines.append('')
    lines.append('## Unresolved Samples')
    lines.append('')
    unresolved = [row for row in payload['rows'] if row['status'] == 'unresolved'][:40]
    if not unresolved:
        lines.append('- None')
    else:
        for row in unresolved:
            lines.append(
                f"- `{row['registrationRaw'] or row['registration']}` "
                f"(id `{row['aircraftId']}`, hex `{row['aircraftHex']}`) "
                f"- hints: {', '.join(row['externalHints'][:2]) if row['externalHints'] else 'none'}"
            )
    lines.append('')
    return '\n'.join(lines) + '\n'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Infer unresolved aircraft ICAO type codes from local datasets.')
    parser.add_argument('--export-path', default=str(DEFAULT_EXPORT_PATH), help='Path to skycards export JSON.')
    parser.add_argument('--db-path', default=str(DEFAULT_DB_PATH), help='Path to aircraft_data.db.')
    parser.add_argument('--models-path', default=str(DEFAULT_MODELS_PATH), help='Path to models.json.')
    parser.add_argument(
        '--base-lookup-path',
        default=str(DEFAULT_LOOKUP_PATH),
        help='Path to base lookup JSON (aircraft_lookup.json).',
    )
    parser.add_argument('--out-json', default=str(DEFAULT_OUT_JSON), help='Output JSON artifact path.')
    parser.add_argument('--out-review', default=str(DEFAULT_OUT_REVIEW), help='Output markdown review path.')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    export_path = Path(args.export_path)
    db_path = Path(args.db_path)
    models_path = Path(args.models_path)
    base_lookup_path = Path(args.base_lookup_path)
    out_json = Path(args.out_json)
    out_review = Path(args.out_review)

    if not export_path.exists():
        raise SystemExit(f'export file not found: {export_path}')
    if not db_path.exists():
        raise SystemExit(f'database file not found: {db_path}')
    if not models_path.exists():
        raise SystemExit(f'models file not found: {models_path}')

    model_ids = load_model_ids(models_path)
    base_lookup = load_base_lookup(base_lookup_path)
    export_rows = load_unique_export_rows(export_path)

    by_hex_records: dict[str, list[dict]] = defaultdict(list)
    by_reg_records: dict[str, list[dict]] = defaultdict(list)
    by_reg_fleet: dict[str, list[dict]] = defaultdict(list)
    manufacturer_model_type_counts: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    model_only_type_counts: dict[str, Counter[str]] = defaultdict(Counter)

    connection = sqlite3.connect(str(db_path))
    try:
        cursor = connection.cursor()
        cursor.execute(
            'SELECT icao, reg, icaotype, manufacturer, model, ownop FROM aircraft_database_sheet1'
        )
        for raw_hex, raw_reg, raw_type, raw_manufacturer, raw_model, raw_owner in cursor:
            aircraft_hex = normalize_code(raw_hex)
            registration = normalize_reg(raw_reg)
            type_code = normalize_code(raw_type)
            manufacturer = normalize_text(raw_manufacturer)
            model_text = normalize_text(raw_model)
            record = {
                'aircraftHex': aircraft_hex,
                'registration': registration,
                'typeCode': type_code,
                'manufacturer': manufacturer,
                'model': model_text,
                'owner': normalize_text(raw_owner),
            }
            if aircraft_hex:
                by_hex_records[aircraft_hex].append(record)
            if registration:
                by_reg_records[registration].append(record)
            if type_code:
                if manufacturer and model_text:
                    manufacturer_model_type_counts[(manufacturer, model_text)][type_code] += 1
                if model_text:
                    model_only_type_counts[model_text][type_code] += 1

        cursor.execute(
            'SELECT TypeCode, Registration, AircraftType, FleetName FROM fr24_fleets_combined_sheet1'
        )
        for raw_type, raw_registration, raw_aircraft_type, raw_fleet_name in cursor:
            type_code = normalize_code(raw_type)
            registration = normalize_reg(raw_registration)
            if not registration:
                continue
            by_reg_fleet[registration].append(
                {
                    'typeCode': type_code,
                    'registrationRaw': normalize_text(raw_registration),
                    'aircraftType': normalize_text(raw_aircraft_type),
                    'fleetName': normalize_text(raw_fleet_name),
                }
            )
    finally:
        connection.close()

    status_counts: Counter[str] = Counter()
    method_counts: Counter[str] = Counter()
    reviewed_rows: list[dict] = []
    mapped_by_base_lookup = 0

    for export_row in export_rows:
        aircraft_hex = export_row['aircraftHex']
        registration = export_row['registration']
        base_type = normalize_code(base_lookup.get(aircraft_hex)) if aircraft_hex else ''
        if base_type and base_type in model_ids:
            mapped_by_base_lookup += 1
            continue

        source_counters: dict[str, Counter[str]] = {}
        evidence_rows: list[dict] = []
        scored_candidates: dict[str, float] = {}
        candidate_sources: dict[str, set[str]] = {}

        hex_records = by_hex_records.get(aircraft_hex, []) if aircraft_hex else []
        reg_records = by_reg_records.get(registration, []) if registration else []
        fleet_records = by_reg_fleet.get(registration, []) if registration else []

        hex_db_counter = Counter(
            record['typeCode']
            for record in hex_records
            if record['typeCode']
        )
        source_counters['hex_db'] = hex_db_counter
        if hex_db_counter:
            evidence_rows.append({'source': 'hex_db', 'candidates': counter_to_rows(hex_db_counter)})
            add_scored_votes(scored_candidates, candidate_sources, 'hex_db', hex_db_counter, valid_model_ids=model_ids)

        reg_db_counter = Counter(
            record['typeCode']
            for record in reg_records
            if record['typeCode']
        )
        source_counters['reg_db'] = reg_db_counter
        if reg_db_counter:
            evidence_rows.append({'source': 'reg_db', 'candidates': counter_to_rows(reg_db_counter)})
            add_scored_votes(scored_candidates, candidate_sources, 'reg_db', reg_db_counter, valid_model_ids=model_ids)

        reg_fleet_counter = Counter(
            record['typeCode']
            for record in fleet_records
            if record['typeCode']
        )
        source_counters['reg_fleet'] = reg_fleet_counter
        if reg_fleet_counter:
            evidence_rows.append({'source': 'reg_fleet', 'candidates': counter_to_rows(reg_fleet_counter)})
            add_scored_votes(scored_candidates, candidate_sources, 'reg_fleet', reg_fleet_counter, valid_model_ids=model_ids)

        manufacturer_model_counter = Counter()
        model_only_counter = Counter()
        candidate_records = hex_records + reg_records
        for record in candidate_records:
            if record['typeCode']:
                continue
            manufacturer = record['manufacturer']
            model_text = record['model']
            if manufacturer and model_text:
                manufacturer_model_counter.update(manufacturer_model_type_counts.get((manufacturer, model_text), Counter()))
            if model_text:
                model_only_counter.update(model_only_type_counts.get(model_text, Counter()))

        source_counters['manufacturer_model_infer'] = manufacturer_model_counter
        if manufacturer_model_counter:
            evidence_rows.append(
                {
                    'source': 'manufacturer_model_infer',
                    'candidates': counter_to_rows(manufacturer_model_counter),
                }
            )
            add_scored_votes(
                scored_candidates,
                candidate_sources,
                'manufacturer_model_infer',
                manufacturer_model_counter,
                valid_model_ids=model_ids,
            )

        source_counters['model_only_infer'] = model_only_counter
        if model_only_counter:
            evidence_rows.append(
                {
                    'source': 'model_only_infer',
                    'candidates': counter_to_rows(model_only_counter),
                }
            )
            add_scored_votes(
                scored_candidates,
                candidate_sources,
                'model_only_infer',
                model_only_counter,
                valid_model_ids=model_ids,
            )

        ranked_candidates = sorted(
            (
                {'typeCode': type_code, 'score': round(score, 4), 'sources': sorted(candidate_sources.get(type_code, set()))}
                for type_code, score in scored_candidates.items()
            ),
            key=lambda row: (-row['score'], row['typeCode']),
        )

        resolved_type = ''
        status = 'unresolved'
        method = 'none'
        confidence = 0.0
        review_note = 'No valid model type candidate found in local sources.'

        if ranked_candidates:
            top = ranked_candidates[0]
            second_score = ranked_candidates[1]['score'] if len(ranked_candidates) > 1 else 0.0
            score_margin = top['score'] - second_score
            resolved_type = top['typeCode']
            method = choose_method_for_type(resolved_type, candidate_sources)
            source_count = len(candidate_sources.get(resolved_type, set()))
            confidence = METHOD_BASE_CONFIDENCE.get(method, METHOD_BASE_CONFIDENCE['unknown'])
            confidence += min(max(source_count - 1, 0), 3) * 0.04
            if score_margin >= 0.25:
                confidence += 0.04
            elif score_margin < 0.12 and len(ranked_candidates) > 1:
                confidence -= 0.10
            confidence = max(0.0, min(0.98, confidence))

            if len(ranked_candidates) > 1 and score_margin < 0.08:
                status = 'ambiguous'
                review_note = 'Candidate scores are too close for safe auto-resolution.'
            elif confidence >= 0.88:
                status = 'inferred_high_confidence'
                review_note = 'Top candidate is strongly supported by local evidence.'
            elif confidence >= 0.72:
                status = 'inferred_medium_confidence'
                review_note = 'Top candidate is plausible, but manual spot-check is recommended.'
            else:
                status = 'ambiguous'
                review_note = 'Evidence is weak; keep this mapping in manual review.'

        review_state = build_review_state(status, confidence)
        status_counts[status] += 1
        method_counts[method] += 1

        reviewed_rows.append(
            {
                'registrationRaw': export_row['registrationRaw'],
                'registration': registration,
                'aircraftId': export_row['aircraftId'],
                'aircraftHex': aircraft_hex,
                'status': status,
                'reviewState': review_state,
                'resolvedTypeCode': resolved_type or None,
                'method': method,
                'confidence': round(confidence, 4),
                'reviewNote': review_note,
                'candidateTypes': ranked_candidates[:8],
                'evidence': evidence_rows,
                'externalHints': build_external_hints(registration),
            }
        )

    summary = {
        'uniqueExportRows': len(export_rows),
        'mappedByBaseLookup': mapped_by_base_lookup,
        'rowsNeedingInference': len(reviewed_rows),
        'statusCounts': dict(sorted(status_counts.items())),
        'methodCounts': dict(sorted(method_counts.items())),
    }

    payload = {
        'generatedAt': utc_now_iso(),
        'inputs': {
            'exportPath': str(export_path),
            'databasePath': str(db_path),
            'modelsPath': str(models_path),
            'baseLookupPath': str(base_lookup_path),
        },
        'summary': summary,
        'rows': reviewed_rows,
    }

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    out_review.parent.mkdir(parents=True, exist_ok=True)
    out_review.write_text(build_markdown_report(payload), encoding='utf-8')

    print(
        'inferred mapping artifact built:',
        f"rows={summary['rowsNeedingInference']}",
        f"high={summary['statusCounts'].get('inferred_high_confidence', 0)}",
        f"medium={summary['statusCounts'].get('inferred_medium_confidence', 0)}",
        f"ambiguous={summary['statusCounts'].get('ambiguous', 0)}",
        f"unresolved={summary['statusCounts'].get('unresolved', 0)}",
    )
    print(f'wrote {out_json}')
    print(f'wrote {out_review}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
