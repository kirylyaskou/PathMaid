---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: milestone
status: executing
stopped_at: "Checkpoint: 05-03 Task 2 human-verify pending"
last_updated: "2026-03-31T22:26:54.052Z"
last_activity: 2026-03-31 -- Phase 06 execution started
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 25
  completed_plans: 21
  percent: 0
---

# STATE.md - Pathfinder 2e DM Assistant

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-31)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** Phase 07 — sqlite-foundry-vtt-data-pipeline

## Current Position

Phase: 07 (sqlite-foundry-vtt-data-pipeline) — NOT STARTED
Plan: 0 of TBD
Status: Phase 06 complete, Phase 07 next
Last activity: 2026-04-01 -- Phase 06 complete (4/4 plans, ARCH-04 human-verified)

Progress: [████░░░░░░] 33% (2/6 phases complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 5. Vite Scaffold | TBD | - | - |
| 6. FSD + Zustand | TBD | - | - |
| 7. SQLite + Data Pipeline | TBD | - | - |
| 8. Combat Tracker | TBD | - | - |
| 9. Bestiary + Encounter | TBD | - | - |
| 10. P2 Differentiators | TBD | - | - |
| Phase 05 P01 | 6min | 2 tasks | 17 files |
| Phase 05 P02 | 6min | 2 tasks | 85 files |
| Phase 05 P03 | 2min | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Key decisions carrying forward from prior milestones:

- VALUED_CONDITIONS includes dying/wounded; dying/wounded cascade gates on has() before delete
- Group exclusivity: clear all group members except new slug, then set
- ImmunityType combines DAMAGE_TYPES + DAMAGE_CATEGORIES + special strings (critical-hits, precision)
- vitality/void used instead of positive/negative energy — PF2e Remaster taxonomy
- All previous milestones (v1.0–v2.1) squashed into single initial commit for fresh start
- @engine path alias configured in tsconfig.json (two entries: @engine -> index.ts, @engine/* -> engine/*)
- Single barrel export at engine/index.ts only — no per-subdirectory index.ts
- Keep React, skip Vue port — working prototype exists, porting is pure cost
- Next.js to Vite+React — SSR unnecessary for Tauri desktop SPA; createHashRouter mandatory (no server for HTML5 history)
- FSD architecture for frontend layers (app/pages/widgets/features/entities/shared)
- Zustand 5 + immer middleware for state management; useShallow mandatory for object selectors
- shadcn/ui (Radix) component library stays; re-init with rsc: false for Vite
- @vitejs/plugin-react (NOT swc — archived) for Vite React support
- getSqlite() raw SQL for performance-critical paths (batch insert, FTS5)
- Splash-before-router pattern for async DB initialization — migrations complete before React mounts
- import.meta.glob for Drizzle migrations (Node.js fs crashes in WebView)
- shared/api/ is sole Tauri IPC boundary — all invoke() calls centralized there
- Engine stays outside FSD as external lib consumed via @engine alias — not modified in v0.3.0
- ConditionManager: module-level Map pattern, NOT in React/Zustand state (mutation bypass)
- Entity state (serializable, SQLite-derived) separated from feature runtime state (session, in-memory)
- [Phase 05]: @vitejs/plugin-react downgraded from ^6.0.1 to ^5.2.0 (v6 requires Vite 8, project uses Vite 6)
- [Phase 05]: eslint downgraded from ^10.1.0 to ^9.22.0 (eslint-plugin-import only supports up to eslint 9)
- [Phase 05]: npm install ran without --legacy-peer-deps — no Radix peer dep conflicts with React 19.2.4
- [Phase 05]: Hooks (use-mobile, use-toast) moved from shared/ui/ to shared/hooks/ for FSD convention
- [Phase 05]: PF2e mock data imports replaced with local type stubs (Creature, ActionCost, XP thresholds) in shared/ui components
- [Phase 05]: AppHeader simplified to theme toggle only for Phase 5 (no campaign selector, no sync status)
- [Phase 05]: Sidebar Ctrl+K (not Cmd+K) since Tauri target is Windows desktop
- [Phase 05]: Migrated boundaries/element-types (deprecated) to boundaries/dependencies with v6 object-based selectors
- [Phase 06]: Entity Creature is own serializable type — engine Creature has non-serializable ConditionManager, can't be used in stores
- [Phase 06]: DisplaySize/DisplayActionCost types bridge engine short codes to UI display values
- [Phase 06]: generateEncounterBudgets takes only partySize (not partyLevel as originally assumed)
- [Phase 06]: steiger insignificant-slice rule disabled for entities/ and features/ (no consumers until wired)

### Pending Todos

- Audit Foundry VTT sync migration SQL filenames for lexicographic sort order before Phase 7
- Verify exact `plugin:sql|execute` / `plugin:sql|select` IPC command name strings against tauri-plugin-sql v2.3.2 Rust source at start of Phase 7

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-01
Stopped at: Phase 06 complete
Resume file: None
Next step: `/gsd:discuss-phase 7` or `/gsd:plan-phase 7`
