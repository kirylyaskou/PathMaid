---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: milestone
status: verifying
stopped_at: Completed 12-02-PLAN.md
last_updated: "2026-04-02T01:10:40.919Z"
last_activity: 2026-04-02
progress:
  total_phases: 15
  completed_phases: 12
  total_plans: 40
  completed_plans: 34
  percent: 33
---

# STATE.md - Pathfinder 2e DM Assistant

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** Phase 12 — stat-block-bestiary-data-quality

## Current Position

Phase: 12 (stat-block-bestiary-data-quality) — EXECUTING
Plan: 2 of 2
Status: Phase complete — ready for verification
Last activity: 2026-04-02

Progress: [███░░░░░░░] 33% (1/3 phases complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11. App Shell Fixes | TBD | — | — |
| 12. Stat Block + Bestiary Data Quality | TBD | — | — |
| 13. Combat UX Sweep | TBD | — | — |
| Phase 12 P01 | 2 | 3 tasks | 3 files |
| Phase 12 P02 | 2 | 5 tasks | 5 files |

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
- Engine stays outside FSD as external lib consumed via @engine alias
- ConditionManager: module-level Map pattern, NOT in React/Zustand state (mutation bypass)
- Entity state (serializable, SQLite-derived) separated from feature runtime state (session, in-memory)
- Entity Creature is own serializable type — engine Creature has non-serializable ConditionManager
- Auto-roll + manual d20 dual mode established (DyingCascadeDialog, PersistentDamageDialog)
- HpControls has damage type combobox + applyIWR inline preview
- TurnControls hooks into turn-manager for condition auto-decrement and persistent damage detection
- [Phase 12]: resolveFoundryTokens() called before stripHtml() at all text-sanitization call sites to avoid HTML tag interference with @-token regexes
- [Phase 12]: STANDARD_SKILLS array has 16 entries (perception displayed separately in core stats, not duplicated in skills section)
- [Phase 12]: source_name nullable column added via non-destructive ALTER TABLE; null preferred over empty string
- [Phase 12]: en.json download failure is non-fatal — sync proceeds without @Localize resolution
- [Phase 12]: fetchDistinctSources returns {pack, name}[] with null fallback to pack name for display

### v0.4.0-specific context

- FIX-01 (encounters crash): caused by Radix ScrollArea interaction with state update in render — likely a useEffect dependency array or an event handler mutating state during paint
- STAT-01 (@-syntax): v1.0 had a 7-pass regex chain for @UUID, @Damage, @Check, @Template — the React port may have lost this sanitizer; check MILESTONES.md v1.0 accomplishments for prior art
- CMB-09 (HP input): replacing 3 inputs (damage/heal/tempHP) with 1 input + 3 buttons simplifies the HpControls widget; value interpretation changes based on which button is pressed

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-02T01:10:40.915Z
Stopped at: Completed 12-02-PLAN.md
Resume file: None
Next step: /gsd:execute-phase 12
