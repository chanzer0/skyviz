# 2026-03-06 Power-User Dashboard Vision

## Goal

Replace the current post-upload long-scroll report with a mobile-first, power-user dashboard that makes the two primary workflows explicit:

- airport discovery and unlock progress
- aircraft inventory, progress, and drill-down

The first implementation pass should center those workflows behind tabs instead of stacking every chart and widget into one document.

## Current-state findings

These findings come from a local HTTP preview plus a live Playwright upload pass using `skycards_user.json`.

### Information architecture

- The loaded state still behaves like a single report page. It exposes 4 stat cards, 1 overview panel, and 10 section panels in one flow.
- The hero chips are anchor links, not task-level navigation. They help with jumping, but they do not reduce page complexity or help the user understand where airport work ends and aircraft work begins.
- The upload panel remains large after load, which keeps non-primary UI above the fold even after the user has already completed the upload step.

### Scroll cost

- Desktop at `1440x1200`: document height `3704px`, about `3.1` viewports tall.
- Desktop map section starts around `2093px`; top cards/reference health start around `2728px`.
- Mobile at `390x844`: document height `8716px`, about `10.3` viewports tall.
- Mobile flight deck starts around `1555px`; the airport map widget starts around `5459px`; top cards start around `7116px`.

### Visual and interaction issues

- The cards do not form a clear visual system after upload. Some panels are narrative, some are KPI tiles, some are charts, and some are diagnostics, but they share similar weight and compete for attention.
- The airport map is visually lightweight and easy to miss. It only plots unlocked airports, so it cannot answer the more important progress question: what is still missing?
- There is no aircraft exploration surface. The only aircraft-specific list is the top-XP table, which is narrow in scope and not searchable, sortable, or expandable.
- The standout table still overflows on mobile. In the sample run, the table container was `337px` wide while the table needed `448px`.

## Product direction

Use a compact "operations console" layout after upload:

- keep the pre-upload hero state for onboarding
- transition into a sticky dashboard shell once a file is loaded
- make tabs the primary information architecture, not jump links
- bias the first screen toward actionable progress, filters, and drill-down

### Visual direction

- Tone: aviation operations console, not marketing landing page
- Density: higher-density cards with stronger hierarchy and smaller decorative copy
- Layout: sticky top app bar, tab rail, and dashboard grids that shift from stacked mobile blocks to split-pane desktop layouts
- Color system: neutral airframe base with explicit status colors for completion and gaps
  - captured: green
  - missing: red
  - muted/reference: slate

## Proposed app shell

### Loaded-state shell

- Sticky top bar with collector name, total XP, file-replace action, and a compact upload status badge
- Sticky tab list with at least:
  - `Map`
  - `Aircraft`
- Optional later tab:
  - `Reference`

### Mobile-first behavior

- Tabs remain visible at the top of the viewport after load
- Filters open in a sheet or inline accordion instead of permanently consuming width
- KPI cards should become a swipeable strip or compact 2-column grid, not a long vertical tower

## Tab 1: Map

## Purpose

Answer the questions:

- How much airport coverage do I have overall?
- Where are my biggest unlock gaps?
- Which countries or continents are complete, near-complete, or mostly untouched?

## Layout

- Mobile:
  - summary KPI strip
  - map
  - continent progress widget
  - country progress widget
- Desktop:
  - map on the left
  - stacked summary/progress widgets on the right

## Core widgets

### Global airport map

- Render all airports from the committed reference snapshot, not only unlocked airports.
- Captured airports render green.
- Uncaptured airports render red.
- Default global view should use clustering or density-aware point rendering so the uncaptured layer remains legible.
- Hover/tap reveals airport detail: code, name, city, country, and captured state.

### Progress summary

- unlocked airports vs total airports
- completion percent
- unlocked countries vs total observed countries
- highest-completion region or next-nearest milestone

### Continent progress

- progress bars or ranked cards per continent
- show unlocked, total, and completion percent
- sortable by completion percent or remaining airports

### Country progress

- searchable ranked list
- show unlocked, total, completion percent, and remaining
- allow quick filters from the map selection

## Data requirements

- `airports.json` currently includes `placeCode` but not continent.
- To support continent widgets cleanly, add a local continent mapping layer during refresh or as a committed supporting artifact keyed by country code.
- The dashboard model should build two airport collections:
  - `capturedAirports`
  - `allReferenceAirports` with capture status attached

## Tab 2: Aircraft

## Purpose

Answer the questions:

- What aircraft do I have?
- Where is my XP concentrated?
- Which categories or tiers are lagging?
- Which aircraft deserve deeper inspection?

## Layout

- KPI strip at top
- progress widgets next
- virtualized aircraft list as the primary lower-half surface

## Core widgets

### Aircraft overview KPIs

- total XP
- observed aircraft/models
- average XP per aircraft
- total glow count
- overall completion percent by rarity tier

### Progress by category/type

- progress cards for aircraft type and card category
- examples:
  - landplane / helicopter / amphibious / gyro / specialty / tiltrotor
  - ultra / rare / scarce / uncommon / common / fantasy

### XP distribution

- XP per rarity tier
- XP per rarity category
- percent completion by rarity tier

### Virtualized aircraft list

- search by manufacturer, model, and code
- sort by XP, glow count, coverage, rarity, first flight, speed, MTOW, or name
- filter by tier, category, aircraft type, manufacturer, and military flag

Each collapsed row should show:

- aircraft name
- model code
- manufacturer
- thumbnail or intentional placeholder
- XP
- glow count
- tier/category badges
- coverage percent

Expanded row should show:

- speed
- MTOW
- wingspan
- seats
- range
- first flight
- engine type/count
- aircraft type
- season availability
- military flag when present

## Data requirements

- Build an aircraft-focused aggregate view model in `site/src/data.js` keyed by `modelId`.
- Normalize Skycards model `type` codes into human-readable labels before rendering aircraft progress widgets.
- The current committed model snapshot exposes image keys (`images`, `imageOverride`) but not ready-to-use local image URLs. The implementation needs either:
  - an official image URL resolver, or
  - a deliberate placeholder strategy for phase 1

### Resolved follow-up: unique registrations per aircraft

- `uniqueRegs[].aircraftId` decodes to decimal ICAO transponder IDs (hex in `aircraft_data.db` column `icao`).
- The mapping path is now `aircraftId (decimal) -> hex ICAO -> aircraft_lookup.byAircraftHex -> modelId (ICAO type)`.
- Total possible registrations per model are sourced from `GET /models/count/{icao}` and stored in `model_registration_counts.json`.
- The aircraft deck can now show a registration badge per card (`caught / total possible`) when lookup and count snapshots are available.

## Component model

Build the new loaded-state UI out of explicit dashboard primitives instead of section-specific markup.

- `dashboard-shell`
- `dashboard-topbar`
- `dashboard-tabs`
- `dashboard-tab-panel`
- `kpi-card`
- `progress-card`
- `filter-chip-group`
- `split-pane`
- `virtualized-aircraft-list`
- `aircraft-row`
- `aircraft-detail-panel`
- `map-legend`
- `country-progress-list`

Accessibility requirements:

- semantic tablist with `role="tablist"`, `role="tab"`, and `role="tabpanel"`
- keyboard support for tab changes and row expansion
- visible focus states preserved in the denser dashboard layout
- virtualization that does not break keyboard navigation or screen-reader labeling

## Recommended implementation order

1. Refactor the post-upload shell in `site/index.html` and `site/src/main.js` so the loaded state becomes a tabbed app shell.
2. Expand `site/src/data.js` to produce airport-progress and aircraft-list view models instead of only chart series.
3. Replace the current airport plot with a captured-vs-missing reference map.
4. Build the aircraft tab widgets and virtualized expandable list.
5. Move current reference health into a lighter secondary surface so it stops competing with primary workflows.

## Validation expectations

- `python scripts/smoke_check.py`
- `python scripts/repo_hygiene_check.py`
- local HTTP preview
- browser pass in desktop and mobile breakpoints after implementation

## Notes for implementation

- Keep collection processing browser-local.
- Do not introduce a backend for tab state, filtering, or virtualization.
- Update `README.md` when the loaded-state workflow changes from report-style navigation to tabbed navigation.
