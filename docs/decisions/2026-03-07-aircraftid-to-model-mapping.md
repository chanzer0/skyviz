# 2026-03-07 AircraftId To Model Mapping

## Context

Skycards export rows in `uniqueRegs[]` (or `caughtRegistrations[]`) include `aircraftId`, but they do not include a direct model identifier.

## Decision

Treat `aircraftId` as a decimal ICAO transponder value and map it as:

1. `aircraftId` (decimal integer)
2. convert to uppercase hex (`int -> hex`, left-pad to 6 chars when shorter)
3. join with `aircraft_data.db` `aircraft_database_sheet1.icao`
4. use `aircraft_database_sheet1.icaotype` as Skycards model ID

This mapping is materialized in `site/data/reference/aircraft_lookup.json` via:

- `python scripts/build_aircraft_lookup_from_db.py --db-path aircraft_data.db`

Total possible registrations per model are sourced from:

- `GET https://api.skycards.oldapes.com/models/count/{icao}`
- refreshed with `python scripts/refresh_model_registration_counts.py`
- stored in `site/data/reference/model_registration_counts.json`

## Evidence Example

- `uniqueRegs.reg = N934AN`, `aircraftId = 11334802`
- `11334802` (decimal) -> `ACF492` (hex)
- DB match: `icao=acf492`, `icaotype=B738`
- model mapping: `B738`

## Known Gaps (Sample: `skycards_user.json`)

At analysis time (2026-03-07), `1,070` unique rows remained unmapped after hex lookup:

- `584`: hex exists in DB but `icaotype` is blank (`hex_present_but_no_type`)
- `481`: hex not present in DB (`hex_not_in_db`)
- `4`: non-ICAO test-style IDs (`hex` length > 6)
- `1`: missing `aircraftId` (`SKY-CARDS`)

Examples:

- `N985AK`, `aircraftId=11386305`, `hex=ADBDC1`: DB row exists but blank `icaotype`
- `EI-XLU`, `aircraftId=5025330`, `hex=4CAE32`: hex missing in DB (fleet table suggests `A21N`)
- `TEST611`, `aircraftId=273286673`, `hex=104A0611`: non-ICAO/test ID
- `SKY-CARDS`, no `aircraftId`: cannot hex-join

## Follow-Through Guidance

- Keep this mapping browser-local by loading `aircraft_lookup.json` as static reference data.
- If coverage needs to improve, optional fallback is registration-based mapping (`reg -> icaotype`) using DB/fleet data.
- Do not call unsupported runtime APIs for `aircraftId` lookup; use committed snapshots.

## Fleet Table Candidate Definition

`fleet table candidate` means a type-code candidate sourced from local table:

- `fr24_fleets_combined_sheet1`

Join rule:

1. Normalize export registration (`uniqueRegs[].reg`) to uppercase alphanumeric.
2. Normalize `fr24_fleets_combined_sheet1.Registration` the same way.
3. Exact normalized-reg match yields candidate `TypeCode`.

This is local data already present in `aircraft_data.db`; it is not a live FR24 API call.

## Resolver Pipeline Artifact

Script:

- `python scripts/build_inferred_aircraft_mappings.py --export-path skycards_user.json --db-path aircraft_data.db`

Outputs:

- `output/inferred_aircraft_type_mappings.json`
- `output/inferred_aircraft_type_mappings_review.md`
- `site/data/reference/aircraft_lookup_resolved.json` (after running `build_resolved_aircraft_lookup.py`)

The resolver ranks sources in this order:

1. `hex_db` (`aircraftId -> hex -> aircraft_database_sheet1.icao -> icaotype`)
2. `reg_db` (`registration -> aircraft_database_sheet1.reg -> icaotype`)
3. `reg_fleet` (`registration -> fr24_fleets_combined_sheet1.Registration -> TypeCode`)
4. `manufacturer_model_infer` (manufacturer+model mode from DB)
5. `model_only_infer` (model text mode from DB)

Reviewer UI (local only):

- `site/tools/inferred-mapping-reviewer.html`
