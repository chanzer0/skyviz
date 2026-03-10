# 2026-03-10 Cardle Daily Game

## Goal

Add a second always-available browser-only daily game beside `Navdle`.

The new game should:

- use `site/data/reference/models.json` plus existing model stats
- let the player guess an aircraft model / Skycard instead of an airport
- keep the compare-and-adjust loop from `Navdle`
- reuse the established Skyviz aircraft-card visual language
- reveal a registration-origin hotspot map after guess `3`
- reveal the hidden 3D model after guess `5`
- cap the run at `8` guesses total
- stay deployable on GitHub Pages with browser-local state only

## Current UX evaluation

`Navdle` already gets several important things right:

- the landing page makes the daily habit obvious before any upload is required
- the board is legible because the user can read progress quickly without leaving the main play surface
- progressive hints and the solved-state recap make the loop feel complete

The main pressure points for adding a second daily game are structural:

- the home-page daily CTA only scales to one game today
- the top-level navigation treats daily play as a single destination
- the current daily board is optimized for dense clue tiles, not card-based model comparison

The new game should keep the same overall rhythm while solving those scaling issues.

## Product direction

The new game should feel like a sister mode rather than a detached tool:

- `Navdle` remains the geographic airport game
- `Cardle` becomes the aircraft-model stat game
- both games stay available without a collection upload
- both games use the same browser-local streak / history pattern, but each keeps independent storage

## Game loop

1. The browser deterministically selects one model for the current UTC day from a curated guessable pool.
2. The player searches by ICAO, manufacturer, alias, or model name.
3. Each submitted guess adds one aircraft card to the board.
4. Each card shows the guessed model's eight comparison stats:
   - `First flight`
   - `Rarity`
   - `Wingspan`
   - `Speed`
   - `Range`
   - `Ceiling`
   - `Seats`
   - `Weight`
5. Every stat cell shows:
   - green for exact
   - yellow for near
   - gray for off
   - an up/down indicator when the hidden target is higher or lower
6. After guess `3`, the hotspot map unlocks and fetches `https://api.skycards.oldapes.com/models/multipoint/{icao}` for the target model.
7. After guess `5`, the hidden 3D model reveal unlocks.
8. The round ends on a correct guess or after `8` guesses.

## Follow-up parity pass

This follow-up keeps the two daily games structurally aligned now that `Cardle` exists:

- increase `Cardle` to `8` guesses so both daily games share the same attempt budget
- tighten the shared guesses-left briefing strip so both boards reclaim vertical space
- replace `Height` in Cardle's support tracker with catchable-registration counts
- reuse Navdle's solved-state celebration and answer-action treatment inside Cardle's intel panel
- keep direct hash-route loads on the boot screen until the requested daily shell is actually ready
- remove Cardle's separate stage header/note copy and move any necessary stage status into overlays on the redacted/live surfaces
- give the registration-origin map a larger share of the intel panel than the stat tracker column
- change Cardle's first-open runtime to the lighter manifest + models + registration-count reference path so home-page launches do not stall on the full dashboard bundle
- reuse the boot/loading screen for blocking first-open daily-tab transitions from the landing view and dashboard tab bar, not just direct hash loads

## Data rules

### Guessable pool

Do not use every reference model blindly. The target pool should prefer models that are playable:

- has ICAO id, manufacturer, and name
- has all eight comparison stats needed by the card
- has enough registration coverage to make the hotspot hint meaningful when possible

### Search

Search should match:

- ICAO id
- primary manufacturer + name
- manufacturer aliases from `manufacturers[]`

### Hints

- The hotspot map is a live browser fetch, not a baked static artifact.
- If the hotspot request fails or returns no coordinates, the UI should explain that the hint is unavailable instead of breaking the board.
- The 3D model reveal should use the same optimized Skycards GLB path family already used by the aircraft detail modal.

## UI direction

### Landing and navigation

- Replace the single daily CTA with a small daily-games hub.
- Expose both `Navdle` and `Cardle` in the top-level navigation.
- Keep `Map` and `Deck` collection-gated.

### Cardle board

- Use a command-deck hero similar to `Navdle` so the games feel related.
- Keep one unified intel card directly below search:
  - a concealed 3D aircraft stage
  - a concealed hotspot map stage
  - the eight comparison stats plus extra model metadata
- Reuse the aircraft-card deck anatomy for guess rows instead of inventing a new card style.
- Keep guess rows compact enough that the board still reads as history instead of a second primary panel.

## Implementation outline

1. Build a model-daily dataset in the browser from the existing reference models payload.
2. Add a dedicated model-daily helper module for selection, search, comparison, and sharing.
3. Add a second daily tab / route plus landing CTAs for both games.
4. Implement the `Cardle` runtime state, persistence, and hint unlock flow.
5. Reuse and adapt the deck card structure for guess cards.
6. Add a small Leaflet hotspot map panel and a hidden 3D reveal panel.
7. Update README and architecture docs.
8. Validate with repo checks and a Playwright browser pass.

## Validation targets

- `python scripts/smoke_check.py`
- `python scripts/repo_hygiene_check.py`
- local HTTP preview
- Playwright pass for landing, `Navdle`, and `Cardle`
- explicit note if live multipoint hint fetches could not be fully validated
