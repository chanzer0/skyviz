# 2026-03-09 Airport Daily Game

## Goal

Add a new always-available `DAILY` airport guessing game to Skyviz, distinct from the existing collection-driven `Map` and `Aircraft` tabs.

The feature should:

- work without a Skycards upload
- feel like a polished daily habit, not a utility panel
- use refreshed OurAirports open data plus derived airport metadata
- stay compatible with the static GitHub Pages deployment model

## Product direction

The daily game should borrow the satisfying compare-and-adjust loop from player/word daily games, but tuned for airports:

- guess through a typeahead airport search
- compare the guess against the hidden airport using exact / close / miss states
- use directional hints for numeric and geographic values
- keep the board visually rewarding with animated reveal cards
- persist the current day's guesses and streaks in browser local storage

## Game-loop decisions

### Answer pool

Do not use every raw OurAirports row as a target. The full dataset includes heliports, closed fields, and many obscure strips that would make the game feel arbitrary.

Instead:

- allow a curated "guessable" pool built from large airports, medium airports, and small airports that still have IATA or scheduled-service signals
- keep the target pool inside that guessable set
- stratify targets into lighter `hub`, balanced `regional`, and harder `frontier` tiers so the daily cadence can vary without becoming random noise

### Core comparison signals

Use the data that is both informative and playable:

- airport size / type
- continent
- country
- region
- elevation
- runway count
- longest runway
- navaid count
- runway layout
- distance + bearing derived from latitude/longitude

Use richer airport metadata for flavor and secondary hints instead of overloading the primary board:

- scheduled service
- surface family
- frequency count / mix
- comment count and comment snippet

### Sticky hooks

- home-page CTA with daily status, streak, and reset timer
- browser-local restore of guesses for the current UTC day
- browser-local streak and win history
- one unlockable hint sourced from airport comments or keywords
- result-state reveal card for the solved airport

## Implementation outline

1. Add a script that downloads the OurAirports CSV snapshots used by the game.
2. Build a derived `daily-game.json` and a small `manifest.json` under `site/data/airports/`.
3. Add the `DAILY` tab and landing CTA.
4. Keep `Map` and `Aircraft` collection-gated, but allow `DAILY` to open without an upload.
5. Add the game runtime, search, comparison logic, persistence, and reveal UI.
6. Update docs, deploy workflow, and validation to include the new generated airport-game artifacts.

## Validation targets

- `python scripts/refresh_airport_game_data.py`
- `python scripts/smoke_check.py`
- `python scripts/repo_hygiene_check.py`
- local HTTP preview
- browser pass across desktop and mobile breakpoints after implementation
