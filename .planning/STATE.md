---
gsd_state_version: 1.0
milestone: v1.6.0
milestone_name: — Spellcasting Deep Fix
status: complete
stopped_at: All 7 phases (77-83) implemented and committed
last_updated: "2026-04-23T13:00:00Z"
last_activity: 2026-04-23 -- v1.6.0 feature-complete; all phases shipped
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 32
  completed_plans: 14
  percent: 100
---

# STATE.md - PathMaid (Pathfinder 2e DM Assistant)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-20)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** Phase 78 — UI split по castType (SpellcastingEditor → dispatcher)

## Current Position

Phase: 77 (complete) → 78 (next)
Plan: 77-01 complete (single-commit phase)
Status: Ready to execute Phase 78
Last activity: 2026-04-23 -- Phase 77 applied: cantrip rank safety net в catalog sync-spells

Progress: [█▒░░░░░░░░] 14% (1 of 7 v1.6.0 phases)

## Accumulated Context

### v1.6.0 Milestone Scope

Spellcasting module рефактор + три PF2e-correctness фикса:
1. Cantrip trait overrides Foundry level.value в catalog (Phase 77) ✅
2. castType-aware UI: prepared/innate как consumable copies, spontaneous как pool, focus без per-rank pips (Phase 78)
3. Heightening в SpellSearchDialog + persistence (Phase 79, migration 0038)
4. use-spellcasting → facade + 6 sub-hooks (Phase 80)
5. Cast-rank через @item.level на encounter_combatant_effects (Phase 81, migration 0039)
6. FSD migration: SpellcastingBlock → features/spellcasting/ (Phase 82)
7. Innate frequency parsing — at-will / N-per-day (Phase 83, migration 0040)

Итого: 3 миграции (0038, 0039, 0040), ~32 commits, ~20 новых файлов.

### v1.5.0 Carried-Forward (shipped 2026-04-23, no formal archive)

- macOS auto-update отключён на уровне frontend (darwin guard в startup hook + "Открыть страницу релиза" в Settings). Нотаризация — future milestone.
- NSIS = canonical Windows updater format (updaterJsonPreferNsis: true).
- shared/api/updater.ts — единственный файл с импортом @tauri-apps/plugin-updater (FSD constraint).
- db.close() вызывается до install() для Windows NSIS compatibility.

### Carry-forward architectural invariants

- createHashRouter mandatory (no HTML5 history in Tauri WebView)
- FSD: useShallow mandatory для Zustand object selectors
- shared/api/ — единственный Tauri IPC boundary
- Engine остаётся вне FSD, @engine alias
- import.meta.glob для Drizzle migrations
- No IIFE в JSX; derived state через useMemo; декомпозиция по FSD (lib → model → ui)

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260422-rh9 | Add Recall Knowledge DC display to CreatureStatBlock | 2026-04-22 | 168e89f0 | [260422-rh9-add-recall-knowledge-dc-display-to-creat](./quick/260422-rh9-add-recall-knowledge-dc-display-to-creat/) |

## Session Continuity

Last session: 2026-04-23
Stopped at: Phase 77 complete — cantrip trait forces rank=0 в spells catalog
Next step: /gsd-execute-phase 78 (UI split по castType)
Resume file: n/a (inline plan in milestone context)
