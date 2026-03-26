# 2026-03-25 Daily Missions Aircraft Markers

## Goal

Upgrade the `/daily-missions/` map so live flights use real aircraft silhouette markers, point in the correct direction, and expose richer flight detail without turning broad mission boards into visual noise.

## Current State

- `site/src/daily-missions-main.js` renders numbered circular mission markers today.
- `site/src/main.js` already has a richer completionist marker system:
  - aircraft-specific silhouette assets
  - rotation by live `track`
  - zoom-aware marker sizing
  - selected-state halo treatment
  - compact aircraft-first popup styling
- The shared daily-missions producer already serializes `track` in the published `flights[]` payload.
- The daily-missions consumer currently drops that field during `normalizeBoard()` and therefore cannot orient markers yet.

## User Goals

- make daily-missions feel closer to the completionist map
- show the real aircraft icon instead of a generic numbered disc
- point the aircraft the correct way on the map
- still distinguish mission `1`, `2`, `3`, and multi-mission overlaps at a glance
- expose speed, altitude, registration, and ICAO/type detail without making the map unreadable
- keep the extra map text easy to toggle off

## Non-Goals

- do not add a backend or move mission matching out of the shared artifact
- do not re-parse mission text in the browser
- do not permanently show dense telemetry labels for every aircraft by default
- do not regress clustering or selection clarity on broad mission boards
- do not fork a second copy of the completionist marker system if a shared helper can cover both surfaces

## Confirmed Constraints

- Browser-only rendering must stay intact.
- The daily-missions route must keep working from the shared `derived/daily-missions` manifest.
- Mission differentiation cannot rely only on color, because `All missions` can include overlap rows.
- The mission artifact already includes enough data for heading-aware markers; this does not need a producer-side schema expansion unless live validation proves a gap.

## Recommended UX

### Marker Base

- Replace the current solid mission circles with aircraft silhouette markers from the same asset family the completionist map already uses.
- Rotate each aircraft by `track` when that value is finite.
- Fall back gracefully to a compact text marker when an aircraft silhouette asset is missing.

### Mission Differentiation

- Keep mission identity as an overlay, not the whole marker body.
- Use a small mission badge plus a subtle mission-colored ring around the aircraft icon.
- For one matching mission, show a compact `M1` / `M2` / `M3` badge.
- For flights that match multiple missions, show a neutral multi-state badge and preserve the full set of mission badges in the popup and right rail.
- Keep the selected marker state obvious with a stronger halo and badge emphasis.

### Telemetry Surfaces

- Treat the popup and the existing `Highlighted flight` rail card as the primary detail surfaces.
- Expand the map popup to include:
  - aircraft/manufacturer-model label when available
  - registration
  - ICAO type code
  - groundspeed
  - altitude
  - age / last-seen label
  - FR24 deep link
- Do not render always-on labels for every aircraft by default.

### Toggle Strategy

- Add one low-noise map-detail control rather than many independent toggles.
- Recommended first shipping behavior:
  - default mode keeps the map clean
  - clicking a flight opens the richer popup and updates the highlighted rail card
  - optional follow-up mode can show a small persistent telemetry callout for the selected flight only
- Defer an `all visible labels` mode unless real usage shows it is needed; it is the most likely clutter source.

## Technical Approach

### 1. Extract Shared Marker Helpers

Create a shared browser helper for aircraft map markers so daily-missions can reuse the completionist marker system instead of copying it.

Candidate responsibilities:

- silhouette asset URL resolution
- asset readiness / missing-asset cache
- zoom-aware sizing
- selection styling hooks
- rotation transform handling
- text fallback handling

Likely surface:

- new shared module under `site/src/` such as `aircraft-markers.js`

### 2. Preserve `track` In Daily Missions

Update `site/src/daily-missions-main.js` normalization so each mission flight keeps:

- `track`
- any related marker-facing metadata needed for fallback behavior

This is the minimum change required to orient the marker correctly.

### 3. Swap Daily-Missions Marker Rendering

Replace the current `markerIcon()` implementation with a mission-aware aircraft marker wrapper that composes:

- shared aircraft silhouette markup
- mission badge overlay
- selected-state halo
- multi-mission treatment

Keep current cluster thresholds and reuse cluster counts rather than trying to render rotating aircraft inside cluster icons.

### 4. Upgrade Popup Content

Replace the current simple popup copy with a compact aircraft-first popup aligned with the completionist style, but mission-aware.

The popup should carry:

- aircraft summary
- registration / callsign line
- route summary
- mission badges
- telemetry pills
- FR24 action

### 5. Add One Optional Detail Toggle

If the richer popup alone does not satisfy the UX goal, add a single `Map detail` control in the daily-missions controls area.

Recommended first extra mode:

- `Selected flight details`

That mode would keep a small persistent telemetry callout attached only to the highlighted marker, which stays readable even on dense boards.

## File Plan

- `site/src/daily-missions-main.js`
  - keep `track`
  - replace marker rendering
  - upgrade popup content
  - optionally add selected-only telemetry-callout state
- `site/daily-missions/index.html`
  - add one compact display/detail control if the toggle ships in the same pass
- `site/daily-missions/styles.css`
  - marker shell, mission badge, selected halo, popup, and optional callout styling
- `site/src/main.js`
  - move completionist marker logic behind a shared helper and keep existing behavior unchanged
- `site/styles.css`
  - keep or extract shared completionist marker styles if the helper becomes cross-page
- `README.md`
  - update if daily-missions map behavior or controls materially change
- `docs/architecture.md`
  - update the daily-missions runtime section to reflect heading-aware aircraft markers and any new display control

## Implementation Phases

### Phase 1: Shared marker foundation

- extract shared aircraft marker helper(s)
- move completionist to the shared helper without changing visible behavior

### Phase 2: Heading-aware daily markers

- preserve `track` in daily-missions normalization
- replace numbered discs with aircraft silhouette markers
- add mission badge / ring differentiation

### Phase 3: Popup refresh

- upgrade the daily-missions popup to surface the requested flight details
- keep the highlighted rail card synchronized

### Phase 4: Optional selected-flight callout

- add one compact detail toggle only if needed after the popup pass
- keep default behavior uncluttered

### Phase 5: Validation and docs

- run Playwright before/after on `/daily-missions/`
- run repo checks
- update docs in the same pass

## Acceptance Criteria

- the `/daily-missions/` map uses aircraft-specific markers instead of generic numbered discs
- markers rotate by live `track` when available
- mission `1`, `2`, `3`, and multi-mission matches remain identifiable at a glance
- the selected flight is visually obvious on the map and in the rail
- popup content covers speed, altitude, registration, and ICAO/type detail
- the default map remains readable on dense mission boards
- clustering still works cleanly on broad missions
- completionist marker behavior does not regress after shared-helper extraction

## Validation

- reproduce the current daily-missions map behavior with Playwright before edits
- validate the new marker treatment with Playwright after edits
- use `python scripts/serve_local_preview.py`
- because there is no committed local daily-missions fixture in this repo today, validate against the shared live manifest path unless a local fixture is added during implementation
- run:
  - `python scripts/smoke_check.py`
  - `python scripts/repo_hygiene_check.py`

## Risks To Watch

- silhouette assets may be missing for some ICAO types; fallback markers must stay legible
- mission badge overlays can overpower small aircraft icons if sized too aggressively
- broad `All missions` boards can get noisy quickly if persistent labels expand beyond the selected flight
- shared-helper extraction can accidentally change completionist marker spacing or popup offsets if not verified carefully

## Recommendation

Ship this as two value checkpoints rather than one oversized change:

1. shared helper + real aircraft markers + heading + richer popup
2. optional selected-flight telemetry callout only if the first pass still feels too sparse

That ordering delivers the biggest UX gain early while keeping clutter and regression risk under control.
