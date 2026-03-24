# 2026-03-24 Daily Missions Standalone Page

## Goal

Add a standalone Skyviz page at `/daily-missions/` that presents the day's three Skycards missions as a live mission board with:

- a dedicated map view
- mission-level filtering and toggling
- a synchronized flight list
- copyable FR24 finder hints
- clean desktop and mobile UX

Producer-side artifact and Discord linking work is tracked in:

- `D:/Repositories/fr24-discord-bot/docs/plans/active/2026-03-24-daily-missions-skyviz-explorer.md`

## Product Model

- no upload required
- no backend
- no browser-side mission parsing
- no dependency on the main dashboard shell
- reads one shared Cloudflare manifest/snapshot and renders it locally in the browser

## User Goals

- open the page directly from Discord and immediately see relevant flights on a map
- understand each mission without knowing FR24 filter syntax already
- switch between missions with one tap
- scan broad mission matches without losing the currently selected mission context
- use the page comfortably on phone-sized screens

## Non-Goals

- do not turn this into another tab inside the upload dashboard
- do not require a Skycards collection upload
- do not fetch the live bot DB or parse raw mission text in the browser
- do not overload the page with completionist-only controls or unrelated dashboard widgets

## Acceptance Criteria

- `/daily-missions/` is a dedicated standalone route under `site/`
- the page renders from the shared `derived/daily-missions` manifest
- direct Discord deep links with `?date=` and `?mission=` open to the correct state
- one mission is active by default; `All missions` remains available but secondary
- desktop and mobile layouts both preserve:
  - clear mission selection
  - visible refresh status
  - usable map/list interaction
  - one-tap copy actions
- error, empty, stale, and loading states are explicit and readable

## UI Direction

Use a clear flight-operations-board aesthetic rather than generic dashboard cards.

### Tone

- calm, technical, and deliberate
- high-information, but not noisy
- more dispatch board than marketing landing page

### Visual principles

- strong date + mission header
- one selected mission with clear emphasis
- restrained color system with mission status accents
- large, legible map and list rows
- copy actions that look like tools, not decoration

### Primary UX rule

Default to one active mission. `All missions` exists for exploration, but the page should not open in the densest possible state.

## Route And Entry Points

Primary route:

- `/daily-missions/`

Supported query params:

- `date=<YYYY-MM-DD>`
- `mission=<mission-key>`
- optional local override during development:
  - `dailyMissionsManifestUrl=<absolute-url>`

Discovery points:

- Discord daily mission board buttons
- optional footer or lightweight nav link from the main Skyviz site

## Page Shell

Recommended new page surfaces:

- `site/daily-missions/index.html`
- `site/src/daily-missions-main.js`
- `site/src/daily-missions-page.js`
- optional shared helpers added to `site/src/data.js` or a dedicated `site/src/daily-missions-data.js`

The page should have its own:

- `title`
- `description`
- `canonical`
- Open Graph tags

The page should reuse:

- global font stack and design tokens where useful
- shared formatting helpers
- Leaflet map runtime

## Data Contract Assumptions

The page should consume one canonical snapshot with:

- mission metadata
- mission finder hints
- deduplicated live flights
- mission-to-flight membership
- refresh/staleness metadata

The browser should not:

- reconstruct manufacturer/model resolution
- recompute mission parsing
- derive mission overlap from scratch when it is already published

## Information Architecture

### Header

- friendly date
- `Daily Missions`
- refresh countdown / updated timestamp
- stale indicator when data ages past the expected interval

### Mission selector

- three prominent mission cards
- one `All missions` toggle
- each card shows:
  - mission number
  - title
  - live match count
  - met / partial / none status

### Main content

- dominant map surface
- synchronized live flight list
- FR24 finder panel for the selected mission

### Secondary actions

- copy filter values
- open selected flight in FR24
- clear search

## Desktop Layout

Recommended structure:

- top header spanning full width
- left mission rail or top mission strip
- central map as the largest surface
- right or lower synchronized flight list
- FR24 finder panel attached to the selected mission area, not buried below the fold

Preferred behavior:

- clicking a mission card filters map and list immediately
- clicking a marker highlights the corresponding list row
- clicking a list row highlights and centers the marker

## Mobile Layout

Mobile is first-class, not a compressed desktop replica.

Recommended structure:

- compact hero header
- sticky horizontal mission-chip rail
- map at about `35vh` to `45vh`
- collapsible FR24 finder panel
- stacked flight list below the map
- search and sort controls collapsed into one compact control row

Mobile requirements:

- no side-by-side overflow
- tap targets sized for thumb use
- copy buttons remain one tap
- list rows remain readable without requiring horizontal scrolling

## Interaction Model

### Mission filtering

- active mission filters the map and list to one mission by default
- `All missions` shows merged rows with mission badges
- flights that match multiple missions should display multiple badges

### Search

- search across callsign, registration, type code, origin, and destination

### Sort

- default: freshest first
- optional:
  - speed
  - altitude
  - route distance when available
  - mission grouping

### Copy actions

Each selected mission should expose explicit copy actions for:

- aircraft codes
- route airport lists
- registration prefixes
- speed/altitude text hints

### Empty and stale states

- `No live matches right now` when a mission is valid but currently unmatched
- `Mission feed is stale` when the snapshot is older than the artifact contract expects
- `Mission board unavailable` when the manifest cannot load

## Map Design Rules

- use mission-colored markers or mission badges sparingly
- avoid opening in `All missions` to prevent visual clutter
- cluster or simplify if very broad missions produce dense overlapping rows
- preserve marker clarity on touch devices
- keep selected marker state obvious without relying only on color

## Accessibility

- mission selector should be keyboard reachable and screen-reader labeled
- selected mission state should be announced via text, not color only
- list rows and map actions should have visible focus states
- copy buttons should expose explicit labels for what gets copied
- stale/error states should use readable inline messaging

## Implementation Phases

### Phase 1: Route and loader

- add `/daily-missions/` page scaffold
- add manifest/snapshot loader with query-param override support
- add local fixture path for preview/dev testing

### Phase 2: Mission-first page shell

- build header, refresh status, mission selector, and finder panel
- wire query param `mission` to first paint selection

### Phase 3: Map and list sync

- render mission-filtered map markers
- render synchronized flight list
- support marker-to-row and row-to-marker focus

### Phase 4: Mobile polish

- tune sticky mission rail
- collapse secondary controls cleanly
- verify comfortable phone interaction and no overflow

### Phase 5: Discoverability and integration

- add lightweight Skyviz navigation/footer link
- verify Discord deep links land correctly

## Validation

- `python scripts/repo_hygiene_check.py`
- `python scripts/smoke_check.py`
- local preview via `python scripts/serve_local_preview.py`
- manual checks at:
  - desktop width
  - tablet width
  - phone width
- direct deep-link checks:
  - `/daily-missions/`
  - `/daily-missions/?date=<date>`
  - `/daily-missions/?date=<date>&mission=<key>`

## Docs To Update During Implementation

- `README.md`
- `docs/architecture.md`
- `site/data/runtime-config.json` when the manifest source is wired

## Rollback

- keep the standalone page additive to the main site
- if the shared manifest is unavailable, show a clean unavailable state rather than breaking the main app
- if Discord deep links ship before the page is merged, point Discord only at the top-level mission board URL once the route is live

## Status

- [x] durable consumer-side plan created
- [x] `/daily-missions/` route scaffolded
- [x] manifest/snapshot loader implemented
- [x] mission selector and finder panel implemented
- [x] map/list sync implemented
- [x] mobile UX pass completed
- [x] Discord deep-link validation completed
