---
gsd_state_version: 1.0
milestone: v1.0.0
milestone_name: — PC Import (Pathbuilder 2e)
status: executing
stopped_at: Phase 42 context gathered
last_updated: "2026-04-05T21:23:48.185Z"
last_activity: 2026-04-05
progress:
  total_phases: 45
  completed_phases: 21
  total_plans: 72
  completed_plans: 53
  percent: 74
---

# STATE.md - Pathfinder 2e DM Assistant

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-05)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** Phase 42 — pc-data-pipeline

## Current Position

Phase: 999.1
Plan: Not started
Status: Executing Phase 42
Last activity: 2026-04-05

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 56
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 42 | 2 | - | - |

## Accumulated Context

| Phase 41-encounters-redesign P01 | 15 | 2 tasks | 6 files |
| Phase 41 P02 | 268 | 2 tasks | 3 files |

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
- [Phase 41]: Active CombatColumn uses global store-backed widgets; inactive renders read-only from tab snapshot — avoids rewriting InitiativeList/CombatantDetail to accept props
- [Phase 41-encounters-redesign]: isHazard added as required on EncounterCombatantRow (optional on EncounterCombatant); handleAddCreature/handleAddHazard owned by EncounterEditor; EncounterCreatureSearchPanel file kept for Plan 02 cleanup
- [Phase 41]: Add logic lifted from EncounterEditor to EncountersPage so DndContext onDragEnd can call it directly
- [Phase 41]: CreatureSearchSidebar accepts optional onAddCreature/onAddHazard props; falls back to builder store when absent

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
- [Phase 30]: Hazard rows in EncounterCreatureList visually distinct: amber left border, amber-950 bg, AlertTriangle icon, LevelBadge, amber text

### v0.8.5-specific context

- [Phase 31]: FOLDER_TO_CATEGORY: 'dfRpdU8Efsenms12'→basic, '0Z6sKp3ActW2pM2e'→skill, 'NnWkuvbKXtwc0nEt'→exploration, 'zXSrhFwRbm6XXqAa'→downtime
- [Phase 31]: actions table: id, name, action_type, action_cost, category, action_category, description, traits, source_book (~101 actions total)
- [Phase 32]: ActionCard: cost display ◆/◆◆/◆◆◆/↩/◇/● in amber mono; category badge colors: basic=blue, skill=green, exploration=purple, downtime=zinc
- [Phase 32]: [[/act slug]]{display} tokens resolved to display text in sanitize()
- [Phase 32]: /actions route, Zap icon in sidebar reference section

### Roadmap Evolution

- v0.5.0 started 2026-04-02, completed 2026-04-02: Combat Redesign + Spells
- v0.6.0 started 2026-04-02, completed 2026-04-02: Items
- v0.7.0 started 2026-04-02, completed 2026-04-02: Conditions
- v0.8.0 started 2026-04-02, completed 2026-04-02: Hazards
- v0.8.5 started 2026-04-02, completed 2026-04-02: Actions Reference
- Phase 35 added 2026-04-04: UX Polish + Starfinder Purge + Encounter Tabs
- Phase 40 added 2026-04-04: Dice Rolls Extended (skills/DC/spells/items clickable + history context + drawer right)

### Pending Todos

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260405-52e | damage-type-multi-trait-chip-selector | 2026-04-05 | eb20c204 | [260405-52e](./quick/260405-52e-damage-type-multi-trait-chip-selector/) |
| 260405-64b | condition picker modal — full names, no truncation | 2026-04-05 | 96ed79ce | [260405-64b](./quick/260405-64b-redesign-the-condition-picker-in-combat-/) |

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-05T21:10:18.359Z
Stopped at: Phase 42 context gathered
Next step: /gsd-discuss-phase 42
