---
gsd_state_version: 1.0
milestone: v0.6.0
milestone_name: milestone
status: planned
stopped_at: v0.6.0 milestone planned — phases 20-24 (Items)
last_updated: "2026-04-02T15:00:00.000Z"
last_activity: 2026-04-02
progress:
  total_phases: 25
  completed_phases: 20
  total_plans: 55
  completed_plans: 42
  percent: 20
---

# STATE.md - Pathfinder 2e DM Assistant

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-02)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** v0.6.0 — Items milestone

## Current Position

Phase: 20
Plan: 20-01 (not started)
Status: Planned, ready to execute
Last activity: 2026-04-02

Progress: [████░░░░░░] 20%

## Performance Metrics

**Velocity:**

- Total plans completed: 42
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|

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

### v0.5.0-specific context

- [Phase 15]: CombatPage.tsx restructured — Bestiary left (22%), Initiative+Detail center (38%, nested vertical ResizablePanelGroup id=combat-center-vertical: 35% list / 65% detail), Stat Card right (40%)
- [Phase 15]: Sticky right panel — lastNpcStatBlock state only updates on NPC select; PC select leaves last NPC stat block visible
- [Phase 15]: In-memory stat block cache in CombatPage (useRef<Map<string, CreatureStatBlockData>>), bounded to 10 entries, evicts oldest on overflow
- [Phase 15]: handleSelect typed (id: string) — matches InitiativeList.onSelect exactly; setSelectedId(null) not needed via onSelect
- [Phase 15]: CombatControls + AddPCDialog share border-b via items-stretch siblings (CombatControls has its own border-b; AddPCDialog wrapper matches it)
- [Phase 15]: TurnControls moved to bottom of center lower sub-panel (renders null when !isRunning)

- Combat tracker layout: Bestiary (left) | Initiative+Detail merged (center) | Creature Stat Card (right)
- Encounters become source of truth: creatures + spell overrides + slot state stored in encounters SQLite
- Combat tracker is a dynamic view of the active encounter — survives tab navigation via Zustand, not stored forever
- Custom spell override stored as: encounter_id + combatant_id → custom_spells[] (non-destructive)
- Spell slot tracking per combatant: DM marks slots used; editable from both Encounters page and combat creature card
- [Phase 17]: extractAndInsertSpells() + extractCreatureSpellcasting() called at end of syncFoundryData + importLocalPacks
- [Phase 18]: SpellcastingBlock uses Collapsible; SpellCard lazy-fetches detail on click via getSpellById
- [Phase 19]: EncounterContext interface exported from entities/creature; conditional spread pattern for TS2322 avoidance

### v0.6.0-specific context

- Foundry equipment packs: `equipment` (weapons/armor/consumables/gear) + `equipment-effects` (effect items)
- Foundry item types: weapon, armor, consumable, equipment, kit, treasure, backpack, shield, book, effect
- `bulk` stored as TEXT ("L", "1", "2", "-") — not converted to float
- `price_gp` converted from price.value object (gp + sp/10 + cp/100 + pp*10) to float
- damage_formula = "{dice}d{die} {damageType}" string
- Non-destructive override pattern (encounter_combatant_items) mirrors encounter_combatant_spells from Phase 19
- @UUID resolution: import-time preferred; runtime fallback via resolveFoundryTokens; unaliased @UUID → DB name lookup

### Roadmap Evolution

- v0.5.0 started 2026-04-02, completed 2026-04-02: Combat Redesign + Spells
- v0.6.0 started 2026-04-02: Items

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-02T15:00:00.000Z
Stopped at: v0.6.0 milestone planned
Next step: Execute Phase 20-01 (DB migration + equipment extraction)
