---
phase: 12-stat-block-bestiary-data-quality
plan: "02"
subsystem: data-pipeline
tags: [sync, sqlite, migration, localization, bestiary]
dependency_graph:
  requires: []
  provides: [source_name-column, localize-resolution, pack-name-display]
  affects: [bestiary-browser, sync-pipeline, creatures-api]
tech_stack:
  added: []
  patterns: [alter-table-migration, non-fatal-fetch, dot-path-traversal, null-fallback-display]
key_files:
  created:
    - src/shared/db/migrations/0007_source_name.sql
  modified:
    - src-tauri/src/sync.rs
    - src/shared/api/sync.ts
    - src/shared/api/creatures.ts
    - src/features/bestiary-browser/ui/BestiaryFilterBar.tsx
decisions:
  - source_name nullable column added via non-destructive ALTER TABLE; no backfill needed
  - en.json download failure is non-fatal — sync proceeds without @Localize resolution
  - fetchDistinctSources returns {pack, name}[] where name falls back to pack if source_name is null
  - Filter value remains source_pack string — only display changes in BestiaryFilterBar
metrics:
  duration: "2 minutes"
  completed_date: "2026-04-02"
  tasks_completed: 5
  files_changed: 5
---

# Phase 12 Plan 02: Data Pipeline — Source Names + @Localize Sync Resolution Summary

**One-liner:** SQLite source_name column + en.json @Localize token resolution at sync time, with human-readable book names in bestiary filter.

## What Was Built

Two data pipeline improvements to the Foundry VTT sync and bestiary display:

1. **source_name column** — Added nullable `source_name TEXT` column to the `entities` SQLite table via migration 0007. The Rust `extract_entity()` function now reads `/system/details/publication/title` from each entity JSON and stores it as `source_name`. TypeScript sync pipeline updated to INSERT 16 columns (was 15).

2. **@Localize token resolution** — During `syncFoundryData()`, after fetching entities from Rust, the pipeline downloads `en.json` from `raw.githubusercontent.com/foundryvtt/pf2e/v13-dev/static/lang/en.json`. All `@Localize[KEY]` tokens in `raw_json` are replaced with their English text before SQLite insert. Download failure is caught and non-fatal.

3. **fetchDistinctSources() upgrade** — Return type changed from `string[]` to `{ pack: string; name: string }[]`. Query now selects both `source_pack` and `source_name`. Null `source_name` falls back to `source_pack` for display.

4. **BestiaryFilterBar display** — `sources` state type updated to `{ pack: string; name: string }[]`. SelectItem renders `s.name` as display text and `s.pack` as value. Filter logic (passing source_pack string to store) is unchanged.

## Tasks Completed

| # | Title | Commit |
|---|-------|--------|
| 1 | Create migration 0007_source_name.sql | 6d6e00e4 |
| 2 | Add source_name to RawEntity struct and extract_entity() in sync.rs | 0d81fdde |
| 3 | Update RawEntity interface and batchInsertEntities in sync.ts | a3061424 |
| 4 | Update CreatureRow and fetchDistinctSources() in creatures.ts | 9df4aeca |
| 5 | Update sources state type and SelectItem rendering in BestiaryFilterBar.tsx | 9d33f92d |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All data wiring is complete end-to-end: migration → Rust extraction → TypeScript insert → API return → UI display.

## Self-Check: PASSED

Files verified:
- FOUND: src/shared/db/migrations/0007_source_name.sql
- FOUND: src-tauri/src/sync.rs (source_name field + extraction)
- FOUND: src/shared/api/sync.ts (16-column INSERT + @Localize resolution + getLocalizeValue)
- FOUND: src/shared/api/creatures.ts ({pack, name}[] return type)
- FOUND: src/features/bestiary-browser/ui/BestiaryFilterBar.tsx (s.pack/s.name rendering)

Commits verified: 6d6e00e4, 0d81fdde, a3061424, 9df4aeca, 9d33f92d — all present in git log.

TypeScript: clean (npx tsc --noEmit — no errors)
Rust: clean (cargo check — Finished dev profile)
