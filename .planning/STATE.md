---
gsd_state_version: 1.0
milestone: v0.8.0
milestone_name: milestone
status: planned
stopped_at: v0.8.0 milestone complete — phases 28-30 shipped
last_updated: "2026-04-02T17:00:00.000Z"
last_activity: 2026-04-02
progress:
  total_phases: 30
  completed_phases: 30
  total_plans: 58
  completed_plans: 52
  percent: 30
---

# STATE.md - Pathfinder 2e DM Assistant

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-02)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** v0.8.0 COMPLETE — all 30 phases shipped

## Current Position

Phase: 999
Plan: Not started
Status: v0.8.0 complete
Last activity: 2026-04-02

Progress: [█████░░░░░] 25%

## Performance Metrics

**Velocity:**

- Total plans completed: 49
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
- [Phase 19]: EncounterContext interface exported from entities/creature; conditional spread pattern for TS2322 avoidance
- Encounters become source of truth: creatures + spell overrides + slot state + item overrides stored in encounters SQLite

### v0.6.0-specific context

- [Phase 20]: ITEM_TYPES = ['weapon','armor','consumable','equipment','treasure','backpack','kit','book','shield','effect']
- [Phase 20]: bulk stored as TEXT ("L","1","2","-"); price_gp converted from {gp,sp,cp,pp} object
- [Phase 20]: creature_items skips melee/ranged/spell/spellcastingEntry/action/lore item types
- [Phase 21]: ITEM_TYPE_COLORS, ITEM_TYPE_LABELS, RARITY_COLORS exported from entities/item
- [Phase 22]: EquipmentBlock collapsible (default closed), grouped weapon→armor→shield→consumable→misc
- [Phase 23]: encounter_combatant_items: is_removed=1 hides base item; is_removed=0 = added item; resetEncounterCombat clears both spell_slots and item_overrides
- [Phase 23]: EquipmentBlock renders when encounterContext provided even with empty base inventory
- [Phase 24]: resolveUUIDTokensInDescriptions() post-processing: builds id→name map from items+spells+entities, updates items.description and spells.description in-place; regex excludes already-aliased @UUID[...]{...}
- [Phase 24]: resolveFoundryTokensForDisplay replaces resolveFoundryTokensForSpell (backward alias kept); adds @Condition[slug] support; drops raw 16-char Foundry IDs gracefully

### v0.8.0-specific context

- [Phase 28]: hazards table: id, name, level, is_complex, hazard_type, stealth_dc, stealth_details, ac, hardness, hp, has_health, description, disable_details, reset_details, traits, source_book, source_pack, actions_json
- [Phase 28]: hazard_type derived at extraction time: 'complex' if is_complex=1, else 'simple' — matches engine HazardType
- [Phase 28]: actions_json: JSON array of {name, actionType, description} from items[] where type='action'
- [Phase 29]: HazardCard: collapsed row (LevelBadge + name + complex/simple badge + stealth DC); expanded: AC/Hardness/HP stats, stealth details, description, disable, reset, actions, traits
- [Phase 30]: CreatureSearchSidebar gains Creatures/Hazards tab toggle; HazardForm removed from EncounterCreatureList; hazard rows clickable with addHazardToDraft(name, level, is_complex?'complex':'simple')

### Roadmap Evolution

- v0.5.0 started 2026-04-02, completed 2026-04-02: Combat Redesign + Spells
- v0.6.0 started 2026-04-02, completed 2026-04-02: Items
- v0.7.0 started 2026-04-02, completed 2026-04-02: Conditions
- v0.8.0 started 2026-04-02, completed 2026-04-02: Hazards

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-02T16:00:00.000Z
Stopped at: v0.6.0 complete (phases 20-24)
Next step: /gsd:plan-milestone v0.9.0
