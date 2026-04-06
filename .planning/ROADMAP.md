# Roadmap: Pathfinder 2e DM Assistant — v0.3.0-pre-alpha

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-20)
- ✅ **v1.1 Compendium & Combat Workspace** — Phases 01-08 (shipped 2026-03-24)
- ✅ **v2.0 PF2e Game Logic Engine** — Phases 01-06 (shipped 2026-03-25)
- ✅ **v2.1 Engine-UI Integration** — Phases 07-11 (shipped 2026-03-25)
- ✅ **v0.2.2-pre-alpha — PF2e Engine** — Phases 1-4 (complete)
- ✅ **v0.3.0-pre-alpha — Frontend Rebuild + Engine Integration** — Phases 5-10 (complete)
- ✅ **v0.4.0-pre-alpha — Stabilization + Polish** — Phases 11-14 (complete)
- ✅ **v0.5.0-pre-alpha — Combat Redesign + Spells** — Phases 15-19 (complete 2026-04-02)
- ✅ **v0.6.0-pre-alpha — Items** — Phases 20-24 (complete 2026-04-02)
- ✅ **v0.7.0-pre-alpha — Conditions** — Phases 25-27 (complete 2026-04-02)
- ✅ **v0.8.0-pre-alpha — Hazards** — Phases 28-30 (complete 2026-04-02)
- ✅ **v0.8.5-pre-alpha — Actions Reference** — Phases 31-32 (complete 2026-04-02)
- 🚧 **v0.9.0-pre-alpha — Items Catalog Overhaul** — Phases 34-35 (complete 2026-04-03)
- 🚧 **v0.9.6-pre-alpha — МАТЕМАТИКА** — Phases 36-41 (complete 2026-04-05)
- 🚧 **v1.0.0 — PC Import (Pathbuilder 2e)** — Phases 42-45 (in progress)

## Phases

<details>
<summary>✅ v1.0–v2.1 (all prior milestones — squashed, SHIPPED)</summary>

All prior milestone phases are archived. Codebase squashed into single initial commit for v0.2.2 fresh start.
Full history preserved in `.planning/milestones/`.

</details>

<details>
<summary>✅ v0.2.2-pre-alpha — PF2e Engine (COMPLETE)</summary>

**Milestone Goal:** Delete all frontend code, isolate the PF2e engine into `/engine`, analyze the Foundry VTT PF2e source repository to identify gaps, and complete missing engine mechanics. Pure TypeScript work — no UI.

- [x] **Phase 1: Cleanup + Architecture** — Delete UI code, strip PWOL, move engine to `/engine` with clean barrel exports
- [x] **Phase 2: Reference Analysis** — Analyze `refs/` Foundry VTT repo; produce gap-analysis document
- [x] **Phase 3: Conditions & Statuses** — Implement missing conditions and statuses identified in analysis
- [x] **Phase 4: Actions & Modifier Math** — Implement missing actions and rework modifier value calculation

</details>

<details>
<summary>✅ v0.3.0-pre-alpha — Frontend Rebuild + Engine Integration (COMPLETE)</summary>

**Milestone Goal:** Port the React prototype from Next.js to Vite + React Router for Tauri, reorganize by FSD, add Zustand state management, reconnect SQLite + Foundry VTT data pipeline, and wire the PF2e engine to replace all mock data with live entity data.

- [x] **Phase 5: Vite Scaffold + Next.js Teardown** — Running Tauri 2 + Vite 6 + React 19 SPA with createHashRouter, Tailwind v4 OKLCH tokens, and all Next.js artifacts purged
- [x] **Phase 6: FSD Structure + Zustand Stores** — Complete FSD directory skeleton with typed entity layers, all Zustand stores designed with correct ownership, and shared/api/ IPC boundary established
- [x] **Phase 7: SQLite + Foundry VTT Data Pipeline** — SQLite + Drizzle ORM reconnected, Foundry VTT sync pipeline working, FTS5 search returning 28K+ entities, mock data deleted
- [x] **Phase 8: Combat Tracker + Engine Integration** — Full 3-panel combat workspace with initiative, HP/tempHP, condition badges wired to engine ConditionManager, auto-decrement, and creature-add from bestiary
- [x] **Phase 9: Bestiary Browser + Encounter Builder** — Bestiary with FTS5 + filters displaying real Foundry stat blocks, and encounter builder with live XP budget wired to engine calculateEncounterRating
- [x] **Phase 10: P2 Differentiators** — Engine-powered IWR preview, Dying/Wounded cascade UI, Weak/Elite presets, persistent damage flat-checks, MAP display, and hazard XP — all using complete barrel-exported engine functions

</details>

### 🚧 v0.4.0-pre-alpha — Stabilization + Polish

**Milestone Goal:** Make everything work without errors — fix crashes, clean up UX, and bring every existing feature to a working end-to-end state. No new architecture, only focused fixes and polish.

- [x] **Phase 11: App Shell Fixes** — Animated splash screen replaces white screen; encounters page loads without crashing (completed 2026-04-01)
- [x] **Phase 12: Stat Block + Bestiary Data Quality** — @-syntax renders as human-readable text; full 17-skill list displayed; sources filter shows book names (completed 2026-04-02)
- [x] **Phase 13: Combat UX Sweep** — Kill button in Dying modal; Detection/Attitude conditions removed from picker; wider condition picker layout; single-input HP controls; persistent damage modal fully functional
 (completed 2026-04-02)

## Phase Details

### Phase 1: Cleanup + Architecture
**Goal**: Codebase is engine-only — all UI deleted, PWOL removed, PF2e modules live in `/engine` with clean barrel exports and zero UI dependencies
**Depends on**: Nothing (first phase)
**Requirements**: CLN-01, CLN-02, ARCH-01, ARCH-02
**Success Criteria** (what must be TRUE):
  1. No Vue components, views, stores, composables, router files, or styles exist anywhere in the repo
  2. No PWOL references exist in any engine module or config file
  3. All PF2e modules (xp.ts, damage.ts, modifiers.ts, damage-helpers.ts, iwr.ts, conditions.ts) are under `/engine`
  4. `/engine/index.ts` barrel export exists and imports nothing from UI, Tauri, Pinia, or Vue
**Plans:** 2/2 plans executed
Plans:
- [x] 01-01-PLAN.md — Delete all UI code, Tauri backend, non-engine files; strip PWOL from XP module
- [x] 01-02-PLAN.md — Relocate engine to /engine with domain subdirectories; create barrel export; configure project

### Phase 2: Reference Analysis
**Goal**: The gap between the current engine and the Foundry VTT PF2e system is fully documented — every missing mechanic identified and prioritized
**Depends on**: Phase 1
**Requirements**: ANAL-01, ANAL-02
**Success Criteria** (what must be TRUE):
  1. A gap-analysis document exists describing what the `refs/` repo implements vs. what `/engine` currently covers
  2. A prioritized list of missing mechanics (conditions, statuses, actions) exists with notes on which are essential for DM use
**Plans:** 1 plan
Plans:
- [x] 02-01-PLAN.md — Analyze refs/pf2e/ across 12 PF2e domains; produce GAP-ANALYSIS.md with prioritized missing-mechanics list

### Phase 3: Conditions & Statuses
**Goal**: The engine implements the complete set of PF2e conditions and statuses identified as missing in Phase 2 analysis
**Depends on**: Phase 2
**Requirements**: ENG-01
**Note**: Scope is intentionally high-level — exact mechanics are determined by Phase 2 gap analysis
**Success Criteria** (what must be TRUE):
  1. All conditions and statuses flagged as missing in the gap-analysis document are implemented in `/engine`
  2. Each implemented condition matches Foundry VTT PF2e source behavior for its value range, cascade rules, and group exclusivity
**Plans**: TBD

### Phase 4: Actions & Modifier Math
**Goal**: The engine implements missing actions from analysis and produces correct final modifier values for all bonus and penalty combinations
**Depends on**: Phase 3
**Requirements**: ENG-02, ENG-03
**Note**: Scope is intentionally high-level — exact actions are determined by Phase 2 gap analysis
**Success Criteria** (what must be TRUE):
  1. All actions flagged as missing in the gap-analysis document are implemented in `/engine`
  2. Typed bonuses stack by taking the highest bonus and lowest penalty per type (not summing all)
  3. Untyped bonuses stack additively
  4. A given set of modifiers produces the same final value as the Foundry VTT PF2e reference implementation for that modifier combination
**Plans:** 4 plans
Plans:
- [x] 04-01-PLAN.md — Type foundations: expanded Creature interface, Action type system, degree-of-success module, performRecoveryCheck refactor
- [x] 04-02-PLAN.md — Action data: ingest 545 entries from refs/, hand-code ~40 combat outcome descriptors
- [x] 04-03-PLAN.md — Statistic system: Statistic class, selector resolver, CreatureStatistics adapter, condition auto-injection, MAP attack sets
- [x] 04-04-PLAN.md — Barrel export: wire all Phase 4 modules into engine/index.ts

### Phase 5: Vite Scaffold + Next.js Teardown
**Goal**: The project runs as a Tauri 2 + Vite 6 + React 19 SPA in dev mode — all Next.js artifacts eliminated, routing scaffolded with createHashRouter, and the full PF2e dark fantasy design system rendering correctly
**Depends on**: Phase 4
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05
**Success Criteria** (what must be TRUE):
  1. `npm run tauri dev` starts the app without errors; all page routes render a placeholder without crashing
  2. Navigating between routes works via React Router v7 hash-based links — no `next/link`, `usePathname`, or `useRouter` imports survive anywhere in src/
  3. All PF2e OKLCH color tokens (`bg-pf-gold`, `text-pf-threat-extreme`, `bg-sidebar`, etc.) render correctly in the app — the dark fantasy UI is visually intact
  4. All 60+ shadcn/ui Radix components are importable and render without errors in Vite (rsc: false, no SSR)
  5. `steiger` FSD linter and `eslint-plugin-boundaries` run on `npm run lint` and enforce layer import direction with zero false negatives
**Plans:** 3/3 plans executed
Plans:
- [x] 05-01-PLAN.md — Scaffold Tauri 2 + Vite 6 project infrastructure, install deps, create PF2e OKLCH design system
- [x] 05-02-PLAN.md — Initialize shadcn/ui, copy 64 components, create hash router with 8 pages, port navigation shell
- [x] 05-03-PLAN.md — Wire steiger + eslint-plugin-boundaries FSD linting, visual verification checkpoint
**UI hint**: yes

### Phase 6: FSD Structure + Zustand Stores
**Goal**: The codebase is organized under FSD layers with all Zustand stores designed and stubbed — entity state (SQLite-derived, serializable) is separated from feature runtime state (session, in-memory), and the @engine alias and shared/api/ IPC boundary are live
**Depends on**: Phase 5
**Requirements**: ARCH-03, ARCH-04, ARCH-05, ARCH-06
**Success Criteria** (what must be TRUE):
  1. All source files live under `app/`, `pages/`, `widgets/`, `features/`, `entities/`, or `shared/` — no files remain in legacy prototype directories
  2. Entity stores (`entities/creature/`, `entities/combatant/`, `entities/condition/`, `entities/encounter/`) hold only serializable SQLite-derived data; feature stores hold only session runtime state — no store mixes both
  3. Every `invoke()` call in the codebase is inside `shared/api/` — zero `invoke()` calls exist in features/, widgets/, or pages/
  4. `import('@engine/...')` resolves correctly in both `features/` and `entities/` layers via `vite-tsconfig-paths`; `eslint-plugin-boundaries` reports no violations
**Plans:** 4/4 plans executed
Plans:
- [x] 06-01-PLAN.md — Install zustand + immer; create shared/api/ IPC boundary with stubbed creature/combat/db wrappers
- [x] 06-02-PLAN.md — Create 4 full entity slices (creature, combatant, condition, encounter) with Zustand stores; move PF2e components to entity ui/ segments
- [x] 06-03-PLAN.md — Create 3 minimal entity skeletons (spell, item, hazard) with type stubs and barrel exports
- [x] 06-04-PLAN.md — Create 3 feature slice stores (combat-tracker, bestiary-browser, encounter-builder); ARCH-04 human-verify checkpoint

### Phase 7: SQLite + Foundry VTT Data Pipeline
**Goal**: The app reads real Foundry VTT entity data from SQLite — migrations run before React mounts, the sync pipeline imports 28K+ entities, FTS5 full-text search works across all entity types, and the mock data file is gone
**Depends on**: Phase 6
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. The splash screen completes DB migration before React Router mounts — no route renders before the schema is current
  2. Triggering Foundry VTT sync downloads the latest release ZIP and upserts 28K+ entities into SQLite without errors
  3. Typing a creature name in FTS5 search returns matching results in under 200ms with the full 28K+ entity dataset loaded
  4. `src/lib/pf2e-data.ts` (or equivalent mock data file) does not exist anywhere in the codebase — `git ls-files | grep pf2e-data` returns nothing
**Plans:** 5/5 plans created
Plans:
- [x] 07-01-PLAN.md — Tauri SQL plugin + DB schema + migrations + entity type fixes (DATA-01)
- [x] 07-02-PLAN.md — Rust sync command: download ZIP, extract JSON, return entities (DATA-02)
- [x] 07-03-PLAN.md — Splash screen gate component with branded PF2e aesthetic (DATA-04)
- [x] 07-04-PLAN.md — Frontend sync pipeline + FTS5 search queries (DATA-02, DATA-03)
- [ ] 07-05-PLAN.md — Settings page sync UI + mock data cleanup (DATA-02, DATA-05)

### Phase 8: Combat Tracker + Engine Integration
**Goal**: The DM can run a full combat encounter — adding creatures from the bestiary, tracking initiative order, adjusting HP/tempHP, and managing conditions — with the engine ConditionManager handling all PF2e condition rules including auto-decrement at turn end
**Depends on**: Phase 7
**Requirements**: CMB-01, CMB-02, CMB-03, CMB-04, CMB-05, BEST-03
**Success Criteria** (what must be TRUE):
  1. The DM can search the bestiary, click a creature, and see it appear in the combat tracker with correct initiative slot
  2. Clicking increment/decrement on a combatant's HP updates the value immediately; tempHP absorbs damage before HP and drains first
  3. The DM can add a condition to a combatant from a dropdown and see a badge appear with the correct icon and numeric value for valued conditions (Frightened 2, Sickened 1, etc.)
  4. Clicking "End Turn" for a combatant with Frightened or Sickened automatically decrements the condition value by 1 (or removes it at 0) via engine CONDITION_EFFECTS
  5. The active turn is highlighted; round and turn counters increment correctly when advancing through the initiative order
**Plans:** 4/4 plans created
Plans:
- [x] 08-01-PLAN.md — Infrastructure: combat DB schema, @dnd-kit install, store refactors, ConditionManager bridge
- [x] 08-02-PLAN.md — 3-panel layout + initiative list (DnD) + bestiary search panel + creature/PC add
- [x] 08-03-PLAN.md — Combatant detail panel + HP controls + condition combobox + condition badges
- [x] 08-04-PLAN.md — Turn advancement + auto-decrement + previous turn + toasts + SQLite auto-save
**UI hint**: yes

### Phase 9: Bestiary Browser + Encounter Builder
**Goal**: The DM can browse and search 28K+ real PF2e creatures with full stat blocks, and build encounters with a live XP budget bar that uses the engine's encounter rating calculation — not mock functions
**Depends on**: Phase 8
**Requirements**: BEST-01, BEST-02, ENC-01, ENC-02, ENC-03, ENC-04
**Success Criteria** (what must be TRUE):
  1. The DM can type a name, select level range, creature type, rarity, and source filters — the bestiary list updates immediately with matching Foundry VTT entities
  2. Clicking a creature in the bestiary shows its full stat block: HP, AC, saves, IWR breakdown, strikes, and special abilities — all from real Foundry data, no hardcoded values
  3. Adding a creature to an encounter draft immediately updates the XP budget bar — the bar reflects engine `calculateEncounterRating` output, not a local mock calculation
  4. Changing party size or party level in the encounter config immediately recalculates XP budget and threat rating — the threat label (Trivial / Low / Moderate / Severe / Extreme) updates in real time from the engine
**Plans:** 2/2 plans executed
Plans:
- [x] 09-01-PLAN.md — Bestiary browser with FTS5 filters, stat block mapper, filter bar, 2-panel page
- [x] 09-02-PLAN.md — Encounter builder with party config persistence, engine XP budget, creature draft
**UI hint**: yes

### Phase 10: P2 Differentiators
**Goal**: The engine's unique PF2e capabilities — IWR preview, Dying/Wounded cascade, Weak/Elite presets, persistent damage, MAP attack display, and hazard XP — are surfaced in the UI, giving DMs information no competing tool provides
**Depends on**: Phase 9
**Requirements**: INT-01, INT-02, INT-03, INT-04, INT-05, INT-06
**Success Criteria** (what must be TRUE):
  1. When the DM enters a damage value and type in the damage dialog, the UI displays the engine `applyIWR` breakdown (raw damage, immunity/resistance/weakness applied, final damage) before the DM confirms
  2. When a combatant reaches 0 HP, a Dying/Wounded cascade dialog appears; the DM can trigger a recovery check and see the engine `performRecoveryCheck` result (success/failure/critical) with the resulting condition change
  3. When adding a creature from the bestiary to combat, the DM can select Weak or Elite tier — HP adjusts immediately using engine `getHpAdjustment` before the creature enters the tracker
  4. Combatants with persistent damage show a prompt at turn end for a flat-check roll; passing removes the condition, failing deals the persistent damage
  5. The creature stat block displays MAP attack modifier sets (MAP 0 / MAP -5 / MAP -10) computed by engine `buildAttackModifierSets`; hazard entries in the encounter builder contribute XP via engine `getHazardXp`
**Plans:** 4/4 plans executed
Plans:
- [x] 10-01-PLAN.md — Weak/Elite tier toggle on creature add + MAP attack display in stat block (INT-03, INT-05)
- [x] 10-02-PLAN.md — IWR damage preview with type combobox and engine applyIWR breakdown (INT-01)
- [x] 10-03-PLAN.md — Dying/Wounded cascade dialog + persistent damage flat-check toasts (INT-02, INT-04)
- [x] 10-04-PLAN.md — Hazard XP in encounter builder via engine getHazardXp (INT-06)
**UI hint**: yes

### Phase 11: App Shell Fixes
**Goal**: The app presents a polished first impression and the encounters page loads reliably — no white flash on startup, no crash from the Radix ScrollArea infinite re-render
**Depends on**: Phase 10
**Requirements**: SPLASH-01, FIX-01
**Success Criteria** (what must be TRUE):
  1. On app launch the user sees an animated CSS d20 die spinning with rotating D&D/PF2e flavor messages instead of a blank white screen
  2. Loading messages cycle through at least 5 thematic strings while the DB initializes
  3. Navigating to the Encounters page does not crash or freeze — the page renders and is fully interactive
  4. The Radix ScrollArea component on the Encounters page renders without triggering an infinite re-render loop (no React "Maximum update depth exceeded" error in console)
**Plans:** 2/2 plans complete
Plans:
- [x] 11-01-PLAN.md — Animated d20 splash screen with TTRPG loading messages (SPLASH-01)
- [x] 11-02-PLAN.md — Replace Radix ScrollArea with native overflow div (FIX-01)
**UI hint**: yes

### Phase 12: Stat Block + Bestiary Data Quality
**Goal**: Creature ability descriptions are human-readable instead of raw Foundry markup, the stat block shows the complete 17-skill list, and the bestiary sources filter shows recognizable book names
**Depends on**: Phase 11
**Requirements**: STAT-01, STAT-02, BEST-04
**Success Criteria** (what must be TRUE):
  1. Ability descriptions in the stat block render @UUID, @Damage, @Check, @Template, and @Localize tokens as formatted human-readable text — no raw `@` markup is visible to the user
  2. The stat block skills section lists all 17 PF2e skills with their calculated modifiers — skills not present in Foundry data are derived from creature level + proficiency rank
  3. The bestiary sources filter dropdown shows human-readable book names (e.g., "Player Core", "Monster Core") rather than folder names (e.g., "pf2e", "sf2e")
  4. Selecting a book name in the sources filter correctly narrows the bestiary results to creatures from that source
**Plans**: TBD
**UI hint**: yes

### Phase 13: Combat UX Sweep
**Goal**: The combat tracker is easier and faster to use — the DM can kill a dying creature in one click, the condition picker shows only combat-relevant conditions in a wider layout, and HP adjustments use a single input with clear action buttons
**Depends on**: Phase 12
**Requirements**: CMB-06, CMB-07, CMB-08, CMB-09, CMB-10
**Success Criteria** (what must be TRUE):
  1. The Dying recovery dialog includes a "Kill" button that immediately sets the combatant to dead without requiring a recovery roll
  2. The condition picker does not show Detection conditions (Observed, Hidden, Undetected, Unnoticed) or Attitude conditions (Hostile, Unfriendly, Friendly, Helpful, Indifferent)
  3. The condition picker is wide enough to show conditions in a multi-column grid — the DM can scan and select a condition without scrolling a narrow list
  4. HP controls show one numeric input field and three clearly labeled buttons (Damage / Heal / TempHP) — no separate input fields for each action
  5. The persistent damage modal opens correctly, displays the condition and damage amount, prompts for a flat-check, applies damage on failure, and removes the condition on success
**Plans:** 3/3 plans complete
Plans:
- [x] 13-01-PLAN.md — Condition picker: remove Detection/Attitudes, tabs + grid layout (CMB-07, CMB-08)
- [x] 13-02-PLAN.md — HP controls: single input + 3 action buttons with split-button damage (CMB-09)
- [x] 13-03-PLAN.md — Verify Kill button + Persistent Damage modal end-to-end (CMB-06, CMB-10)
**UI hint**: yes

### Phase 14: Stat Block Polish 2
**Goal**: Stat block is fully readable and visually polished — all Foundry token patterns resolved ([[/act]], [[/br]], {Nfeet} area templates), Fighter's Fork has correct weapon data (group=trident, shove trait, Brute Strength extra damage), and the color system makes key stats instantly scannable (section headers, HP, saves, damage types, trait tags, ability text)
**Depends on**: Phase 12
**Requirements**: STAT-01, STAT-02
**Success Criteria** (what must be TRUE):
  1. [[/act slug]] tokens render as action name (e.g. "Shove") — no raw [[ ]] markup visible
  2. [[/br expr #label]]{display} tokens render as display text only
  3. {Nfeet} area template tokens render as readable range text (e.g. "30-foot area")
  4. Fighter's Fork strike shows weapon group (trident), shove trait, and Brute Strength extra damage where applicable
  5. Section headers (Strikes, Abilities, Skills) have gradient/themed color treatment
  6. HP, saves, damage type labels, and trait tags each have distinct color coding for instant scanability
  7. Ability description text is visually distinct from ability names (bold names, readable body text)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Cleanup + Architecture | v0.2.2 | 2/2 | Complete | 2026-03-31 |
| 2. Reference Analysis | v0.2.2 | 1/1 | Complete | 2026-03-31 |
| 3. Conditions & Statuses | v0.2.2 | TBD | Complete | 2026-03-31 |
| 4. Actions & Modifier Math | v0.2.2 | 4/4 | Complete | 2026-03-31 |
| 5. Vite Scaffold + Next.js Teardown | v0.3.0 | 3/3 | Complete | 2026-04-01 |
| 6. FSD Structure + Zustand Stores | v0.3.0 | 4/4 | Complete | 2026-04-01 |
| 7. SQLite + Foundry VTT Data Pipeline | v0.3.0 | 5/5 | Complete | 2026-04-01 |
| 8. Combat Tracker + Engine Integration | v0.3.0 | 4/4 | Complete | 2026-04-01 |
| 9. Bestiary Browser + Encounter Builder | v0.3.0 | 2/2 | Complete | 2026-04-01 |
| 10. P2 Differentiators | v0.3.0 | 4/4 | Complete | 2026-04-01 |
| 11. App Shell Fixes | v0.4.0 | 2/2 | Complete | 2026-04-02 |
| 12. Stat Block + Bestiary Data Quality | v0.4.0 | 2/2 | Complete | 2026-04-02 |
| 13. Combat UX Sweep | v0.4.0 | 3/3 | Complete    | 2026-04-02 |
| 14. Stat Block Polish 2 | v0.4.0 | 2/2 | Complete    | 2026-04-02 |
| 15. Combat Tracker Layout Redesign | v0.5.0 | 1/1 | Complete | 2026-04-02 |
| 16. Encounter Persistence | v0.5.0 | 3/3 | Complete    | 2026-04-02 |
| 17. Spell Import Pipeline | v0.5.0 | 2/2 | Complete | 2026-04-02 |
| 18. Spell Display + Catalog | v0.5.0 | 2/2 | Complete | 2026-04-02 |
| 19. Spell Slot Tracking + Custom Override | v0.5.0 | 2/2 | Complete | 2026-04-02 |
| 20. Equipment Import Pipeline | v0.6.0 | 2/2 | Complete | 2026-04-02 |
| 21. Items Catalog Page | v0.6.0 | 2/2 | Complete | 2026-04-02 |
| 22. Creature Inventory Display | v0.6.0 | 1/1 | Complete | 2026-04-02 |
| 23. Encounter Inventory Editor | v0.6.0 | 1/1 | Complete | 2026-04-02 |
| 24. @-Token Resolution | v0.6.0 | 1/1 | Complete | 2026-04-02 |

### 🚧 v0.5.0-pre-alpha — Combat Redesign + Spells

**Milestone Goal:** Redesign combat tracker into a 3-panel layout (Bestiary | Initiative+Detail | Stat Card), make Encounters the persistent source of truth for combat state, and add a complete spell system — import 1,797 spells from Foundry VTT, display spellcasting in stat blocks, add a spell catalog page, and track spell slot usage per encounter with non-destructive custom spell overrides.

- [ ] **Phase 15: Combat Tracker Layout Redesign** — New 3-panel layout with merged initiative+detail center, bestiary left, creature stat card right
- [x] **Phase 16: Encounter Persistence** — Encounters store creature lists; "Load into Combat" populates tracker; HP/conditions/slots save back to encounter SQLite
 (completed 2026-04-02)
- [x] **Phase 17: Spell Import Pipeline** — Parse 1,797 Foundry VTT spell files into SQLite; parse creature spellcasting entries and prepared spell lists (completed 2026-04-02)
- [x] **Phase 18: Spell Display + Catalog** — Spellcasting section in stat block (tradition, DC, attack, spells by rank); standalone Spells catalog page with FTS5 + filters (completed 2026-04-02)
- [x] **Phase 19: Spell Slot Tracking + Custom Override** — Per-encounter slot pip UI (click to toggle); slot state in encounter SQLite; custom spell add/remove per encounter (non-destructive) (completed 2026-04-02)

### Phase 15: Combat Tracker Layout Redesign
**Goal**: The combat tracker renders as 3 panels — Bestiary search (left), merged initiative list + creature detail (center), creature stat card (right) — and selecting a combatant in the initiative list updates both the center detail view and the right stat card simultaneously
**Depends on**: Phase 14
**Requirements**: CMBL-01, CMBL-02, CMBL-03, CMBL-04
**Success Criteria** (what must be TRUE):
  1. The combat tracker page renders 3 resizable panels: bestiary search left, merged initiative+detail center, stat card right — with no separate "detail panel" modal or tab switch needed
  2. The center panel shows the initiative order list at the top and the selected creature's HP controls, conditions, and turn buttons below it — both visible at once without scrolling off-screen
  3. Clicking any row in the initiative list selects that combatant and immediately updates the right panel to show that creature's full stat block (same stat block as Bestiary)
  4. The bestiary search left panel is functional — DM can search creatures and add them to the initiative list from the same panel without a modal
**Plans**: 1 plan
Plans:
- [x] 15-01-PLAN.md — Restructure CombatPage into 3-panel layout: Bestiary left, Initiative+Detail center (nested vertical), Stat Card right; lazy NPC stat block fetch with sticky panel + in-memory cache (CMBL-01, CMBL-02, CMBL-03, CMBL-04)
**UI hint**: yes

### Phase 16: Encounter Persistence
**Goal**: Encounters become the source of truth for combat state — each saved encounter stores its creature list, and the combat tracker loads from an encounter rather than managing creatures independently; combat HP/condition changes write back to encounter SQLite
**Depends on**: Phase 15
**Requirements**: ENCP-01, ENCP-02, ENCP-03, ENCP-04
**Success Criteria** (what must be TRUE):
  1. Creating an encounter in the Encounters page allows adding creatures to a persistent creature list — the list survives app restart
  2. Clicking "Load into Combat" on a saved encounter navigates to the combat tracker pre-populated with that encounter's creature list, correct HP, and weak/elite tiers
  3. Dealing damage to a combatant in the tracker writes the updated HP to the encounter's SQLite record in real time — reopening the encounter shows the updated HP
  4. Clicking "Reset Encounter" restores all combatants to their initial HP, clears all conditions, and marks all spell slots as available
**Plans**: 3 plans
Plans:
- [ ] 16-01-PLAN.md — DB migration (encounters/encounter_combatants/encounter_conditions tables) + shared/api/encounters.ts + Encounter entity type expansion (ENCP-01..04 foundation)
- [ ] 16-02-PLAN.md — EncountersPage split layout: SavedEncounterList + EncounterEditor + EncounterCreatureSearchPanel with [W][+][E] add (ENCP-01)
- [ ] 16-03-PLAN.md — Load into Combat + encounter write-back auto-save + Reset Encounter (ENCP-02, ENCP-03, ENCP-04)
**UI hint**: yes

### Phase 17: Spell Import Pipeline
**Goal**: All 1,797 Foundry VTT spells are stored in SQLite and accessible by the frontend; spellcasting entries and prepared spell lists for NPC creatures are parsed and linked to creature records
**Depends on**: Phase 16
**Requirements**: SPLI-01, SPLI-02, SPLI-03
**Success Criteria** (what must be TRUE):
  1. After running sync, the `spells` table contains 1,700+ rows with foundry_id, name, rank, traditions, traits, description, damage, area, range, duration, action_cost, save_stat, and source_book populated
  2. Spellcaster NPC creatures (e.g. Death Tower Necromancer) have their spellcasting entries stored — tradition "arcane", cast_type "prepared", DC 29, attack +21, slots for ranks 0–5
  3. The prepared spell list for the Death Tower Necromancer can be queried from SQLite and returns the correct spells for each rank as shown in the Foundry JSON
**Plans**: 2/2 plans executed
Plans:
- [x] 17-01-PLAN.md — DB migration: spells + creature_spellcasting_entries + creature_spell_lists tables with FTS5 (SPLI-01..03 foundation)
- [x] 17-02-PLAN.md — Spell extraction from entity raw_json + creature spellcasting parse + shared/api/spells.ts query functions (SPLI-01, SPLI-02, SPLI-03)

### Phase 18: Spell Display + Catalog
**Goal**: Spellcaster creatures show their spellcasting section in the stat block with expandable spell cards, and a new Spells page lets the DM browse and search all 1,797 imported spells
**Depends on**: Phase 17
**Requirements**: SPLD-01, SPLD-02, SPLD-03, SPLC-01, SPLC-02, SPLC-03
**Success Criteria** (what must be TRUE):
  1. Opening the Death Tower Necromancer's stat block shows a "Spellcasting" section with "Arcane Prepared" badge, DC 29, attack +21, and spells grouped by rank (Cantrips through Rank 5)
  2. Clicking a spell name in the stat block expands it inline showing area, range, duration, damage formula, save type, traits, and heightening rules
  3. The Spells page loads with all imported spells listed; typing a spell name in the search box filters results via FTS5 in under 200ms
  4. Filtering by tradition "arcane" and rank "5" shows only arcane rank-5 spells
**Plans**: 2/2 plans executed
Plans:
- [x] 18-01-PLAN.md — SpellcastingSection type + fetchCreatureStatBlockData async loader (SPLD-01..03 foundation)
- [x] 18-02-PLAN.md — SpellcastingBlock + SpellCard in CreatureStatBlock; full SpellsPage with FTS5 search + tradition/rank filters (SPLD-01, SPLD-02, SPLD-03, SPLC-01, SPLC-02, SPLC-03)
**UI hint**: yes

### Phase 19: Spell Slot Tracking + Custom Override
**Goal**: The DM can track which spell slots have been used for each spellcasting creature in an encounter, and can non-destructively customize a creature's prepared spell list for a specific encounter
**Depends on**: Phase 18
**Requirements**: SLOT-01, SLOT-02, SLOT-03, CUST-01, CUST-02, CUST-03
**Success Criteria** (what must be TRUE):
  1. The creature stat card in the combat tracker shows spell slots for each rank as clickable pips (e.g. ●●○○ for 2 used out of 4); clicking a pip toggles it used/available
  2. After marking slots used and switching away from the combat tab, returning shows the same slot state — stored in encounter SQLite, not lost on navigation
  3. From the Encounters page, the DM can open a creature's spell override editor, search for a spell by name, and add it to a rank — the encounter's combat load reflects the addition without modifying the base creature
  4. Removing a spell from a prepared list in the override editor removes it from that encounter's display only — the creature's base spells in the `creatures` table are unchanged
**Plans**: 2/2 plans executed
Plans:
- [x] 19-01-PLAN.md — DB migration: encounter_spell_slots + encounter_combatant_spells; API functions in encounters.ts (SLOT-01..03, CUST-01..03 foundation)
- [x] 19-02-PLAN.md — SlotPips + AddSpellRow + SpellcastingBlock extended with encounterContext; CombatPage wired (SLOT-01, SLOT-02, SLOT-03, CUST-01, CUST-02, CUST-03)
**UI hint**: yes

### 🚧 v0.6.0-pre-alpha — Items

**Milestone Goal:** Full equipment system — import all Foundry VTT equipment (weapons, armor, consumables, gear) into SQLite, build an Items catalog page with FTS5 search and filters, display creature inventory in stat blocks, add per-encounter inventory editing with non-destructive overrides, and audit/fix @-token resolution for item and creature descriptions.

- [x] **Phase 20: Equipment Import Pipeline** — Parse all equipment entity types into dedicated `items` table + FTS5; `creature_items` for NPC inventory; shared/api/items.ts (completed 2026-04-02)
- [x] **Phase 21: Items Catalog Page** — Replace placeholder ItemsPage with FTS5 search, type/level/rarity filters, expandable ItemCard rows (completed 2026-04-02)
- [x] **Phase 22: Creature Inventory Display** — Parse NPC carried items from raw_json; show Equipment section in stat block grouped by type (completed 2026-04-02)
- [x] **Phase 23: Encounter Inventory Editor** — Per-encounter item overrides (add/remove items non-destructively); same pattern as spell overrides (completed 2026-04-02)
- [x] **Phase 24: @-Token Resolution** — Audit all @UUID token types in item/creature descriptions; resolve unaliased item/spell/condition links from DB; import-time pre-resolution (completed 2026-04-02)

### Phase 20: Equipment Import Pipeline
**Goal**: All Foundry VTT equipment items are stored in a dedicated SQLite table with FTS5 search, and NPC creature inventories are parsed and linked to creature records
**Depends on**: Phase 19
**Requirements**: EQUIP-01, EQUIP-02, EQUIP-03
**Success Criteria** (what must be TRUE):
  1. After running sync, the `items` table contains entries for all equipment packs with item_type, level, rarity, bulk, price_gp, traits, and type-specific fields (damage_formula, ac_bonus, etc.) populated
  2. FTS5 search on items returns results within 200ms for a name query against the full dataset
  3. A spellcaster NPC (e.g. Death Tower Necromancer) has its carried equipment (armor, weapons, consumables) queryable from `creature_items` by creature_id
**Plans**: 2 plans
Plans:
- [ ] 20-01-PLAN.md — DB migration: items + items_fts + creature_items tables; extractAndInsertItems + extractCreatureItems in sync.ts
- [ ] 20-02-PLAN.md — shared/api/items.ts: searchItems, getItemById, getItemsByType, getItemCount, getCreatureItems; barrel export

### Phase 21: Items Catalog Page
**Goal**: The DM can browse and search all imported equipment from the Items page with type, level range, and rarity filters
**Depends on**: Phase 20
**Requirements**: ITMCAT-01, ITMCAT-02, ITMCAT-03, ITMCAT-04
**Success Criteria** (what must be TRUE):
  1. The Items page shows a searchable list of items; typing a name filters via FTS5 within 200ms
  2. Selecting "Weapon" type filter shows only weapons; combining with level range and rarity further narrows results
  3. Clicking an item expands it inline showing description, type-specific stats (damage formula for weapons, AC bonus for armor, uses for consumables), and traits
  4. Item type badges are color-coded and immediately scannable; price and bulk are visible in the collapsed row
**Plans**: 2 plans
Plans:
- [ ] 21-01-PLAN.md — ItemCard component (collapsed row + expanded detail, type badge colors, type-specific stats)
- [ ] 21-02-PLAN.md — Full ItemsPage: search input, type/rarity/level filter pills, scrollable ItemCard list, result count
**UI hint**: yes

### Phase 22: Creature Inventory Display
**Goal**: Creature stat blocks show a collapsible Equipment section listing all carried non-combat items from the Foundry VTT data
**Depends on**: Phase 20
**Requirements**: CRINV-01, CRINV-02
**Success Criteria** (what must be TRUE):
  1. Opening a creature stat block that carries equipment shows an "Equipment" section with items grouped by type (weapons → armor → consumables → misc)
  2. Each item shows name, quantity (if >1), bulk, and key stat (damage formula for weapons, AC bonus for armor)
  3. Creatures with no equipment do not show the Equipment section
**Plans**: 1 plan
Plans:
- [ ] 22-01-PLAN.md — fetchStatBlock extended with getCreatureItems; EquipmentBlock component in CreatureStatBlock
**UI hint**: yes

### Phase 23: Encounter Inventory Editor
**Goal**: The DM can add or remove items from a creature's inventory for a specific encounter without modifying the base creature data
**Depends on**: Phase 22
**Requirements**: ENCINV-01, ENCINV-02, ENCINV-03
**Success Criteria** (what must be TRUE):
  1. In encounter context, each item in the Equipment section has a hover-revealed × button; clicking it hides the item for that encounter only (base creature unchanged)
  2. An "Add Item" search row at the bottom of Equipment (encounter context only) lets the DM search and add any item from the catalog; it appears in the combat stat card immediately
  3. After resetting the encounter, all item overrides are cleared and the creature's base inventory is restored
**Plans**: 1 plan
Plans:
- [ ] 23-01-PLAN.md — DB migration: encounter_combatant_items; API in encounters.ts; EquipmentBlock extended with encounterContext
**UI hint**: yes

### Phase 24: @-Token Resolution
**Goal**: All @UUID token types in item and creature descriptions resolve to human-readable text — no raw Foundry IDs or unparsed tokens visible to the DM
**Depends on**: Phase 21
**Requirements**: ATRES-01, ATRES-02, ATRES-03
**Success Criteria** (what must be TRUE):
  1. @UUID[Compendium.pf2e.equipment.Item.X] without alias renders as the item's name, not the raw ID
  2. @UUID[Compendium.pf2e.spells-srd.Item.X] and @UUID[Compendium.pf2e.conditions.Item.X] similarly resolve to names
  3. A DB audit query (`SELECT description FROM items WHERE description LIKE '%@UUID%' AND description NOT LIKE '%]{%'`) returns 0 rows after a fresh sync
**Plans**: 1 plan
Plans:
- [ ] 24-01-PLAN.md — resolveFoundryTokensAsync in mappers.ts; post-processing pass in sync.ts to resolve unaliased @UUID links; audit queries
**UI hint**: no

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 20. Equipment Import Pipeline | v0.6.0 | 2/2 | Complete | 2026-04-02 |
| 21. Items Catalog Page | v0.6.0 | 2/2 | Complete | 2026-04-02 |
| 22. Creature Inventory Display | v0.6.0 | 1/1 | Complete | 2026-04-02 |
| 23. Encounter Inventory Editor | v0.6.0 | 1/1 | Complete | 2026-04-02 |
| 24. @-Token Resolution | v0.6.0 | 1/1 | Complete | 2026-04-02 |

### 🚧 v0.7.0-pre-alpha — Conditions

**Milestone Goal:** Full conditions reference system — extract all 49 Foundry VTT conditions into a dedicated SQLite table with structured mechanical data (modifier rules, overrides, valued flags), build a ConditionsPage reference catalog, and wire condition badges in the combat tracker to show description + modifier detail on click. Modifier data stored in `rules_json` for future engine integration.

- [x] **Phase 25: Conditions Data Pipeline** — DB migration `conditions` table + extraction from entities during sync + shared/api/conditions.ts (completed 2026-04-02)
- [x] **Phase 26: Conditions Reference Page** — Replace stub with full catalog: group tabs, search, ConditionCard with description + modifier summary + overrides (completed 2026-04-02)
- [x] **Phase 27: Condition Badge Integration** — ConditionBadge info button → inline detail panel with description excerpt + modifiers + overrides (completed 2026-04-02)

### Phase 25: Conditions Data Pipeline
**Goal**: All 49 Foundry VTT conditions are stored in a dedicated SQLite table with parsed mechanical data ready for reference display and future modifier engine integration
**Depends on**: Phase 24
**Requirements**: COND-01, COND-02
**Success Criteria** (what must be TRUE):
  1. After sync, the `conditions` table contains all conditions with is_valued, group_name, overrides, modifier_summary, and rules_json populated
  2. `getConditionBySlug('frightened')` returns a row with modifier_summary "Status −value to all checks" and rules_json containing the FlatModifier rule
  3. `getAllConditions()` returns all conditions sorted by name
**Plans**: 2 plans
Plans:
- [ ] 25-01-PLAN.md — DB migration: conditions table; extractAndInsertConditions + parseModifierSummary in sync.ts
- [ ] 25-02-PLAN.md — shared/api/conditions.ts: getAllConditions, searchConditions, getConditionBySlug, getConditionsByGroup

### Phase 26: Conditions Reference Page
**Goal**: The DM can browse all PF2e conditions with their mechanical effects, descriptions, and override relationships from the Conditions page
**Depends on**: Phase 25
**Requirements**: CONDP-01, CONDP-02, CONDP-03
**Success Criteria** (what must be TRUE):
  1. The Conditions page shows all conditions grouped by category with a search filter
  2. Clicking a condition expands it showing: full description, modifier summary (e.g. "Status −value to all checks"), and overrides list
  3. Valued conditions show a badge indicating they take a numeric value
**Plans**: 1 plan
Plans:
- [ ] 26-01-PLAN.md — Full ConditionsPage: group tabs, search, ConditionCard with valued badge, modifier summary, overrides, description
**UI hint**: yes

### Phase 27: Condition Badge Integration
**Goal**: Condition badges in the combat tracker show an info button that opens a detail panel with the condition's description and modifier summary — DM never needs to leave combat to look up a condition
**Depends on**: Phase 26
**Requirements**: CONDB-01, CONDB-02
**Success Criteria** (what must be TRUE):
  1. Each condition badge in the combat tracker has an ⓘ icon; clicking it shows a detail panel with name, modifier summary, overrides, and 300-char description excerpt
  2. The panel stays open until × is clicked or another badge's ⓘ is clicked
  3. Persistent damage conditions (e.g., persistent-fire) show "No reference data" gracefully when not in conditions table
**Plans**: 1 plan
Plans:
- [ ] 27-01-PLAN.md — ConditionBadge info button; ConditionDetailPopover in ConditionSection.tsx; getConditionBySlug fetch
**UI hint**: yes

## Progress (v0.7.0)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 25. Conditions Data Pipeline | v0.7.0 | 2/2 | Complete | 2026-04-02 |
| 26. Conditions Reference Page | v0.7.0 | 1/1 | Complete | 2026-04-02 |
| 27. Condition Badge Integration | v0.7.0 | 1/1 | Complete | 2026-04-02 |

### 🚧 v0.8.0-pre-alpha — Hazards

**Milestone Goal:** Full hazard system — import all Foundry VTT hazards into SQLite with stat block data (AC, HP, hardness, stealth, disable, reset, actions), add a Hazards reference catalog page, and wire encounter builder to search hazards from DB instead of manual form.

- [x] **Phase 28: Hazard Import Pipeline** — DB migration `hazards` table + extractAndInsertHazards in sync.ts + shared/api/hazards.ts (completed 2026-04-02)
- [x] **Phase 29: Hazards Catalog Page** — `/hazards` page with search, simple/complex filter, HazardCard with stat block details (completed 2026-04-02)
- [x] **Phase 30: Encounter Builder Hazard Search** — Replace manual hazard form with DB-backed search tab in CreatureSearchSidebar (completed 2026-04-02)

### Phase 28: Hazard Import Pipeline
**Goal**: All Foundry VTT hazards are stored in a dedicated SQLite table with parsed stat block data
**Plans**: 1 plan
Plans:
- [x] 28-01-PLAN.md — DB migration + extractAndInsertHazards + shared/api/hazards.ts

### Phase 29: Hazards Catalog Page
**Goal**: The DM can browse all PF2e hazards with full stat blocks from the Hazards page
**Plans**: 1 plan
Plans:
- [x] 29-01-PLAN.md — HazardsPage with search, filter, HazardCard; router + nav
**UI hint**: yes

### Phase 30: Encounter Builder Hazard Search
**Goal**: Encounter builder searches real imported hazards from DB instead of manual name/level/type form
**Plans**: 1 plan
Plans:
- [x] 30-01-PLAN.md — CreatureSearchSidebar hazard tab; remove HazardForm from EncounterCreatureList
**UI hint**: yes

## Progress (v0.8.0)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 28. Hazard Import Pipeline | v0.8.0 | 1/1 | Complete | 2026-04-02 |
| 29. Hazards Catalog Page | v0.8.0 | 1/1 | Complete | 2026-04-02 |
| 30. Encounter Builder Hazard Search | v0.8.0 | 1/1 | Complete | 2026-04-02 |

### 🚧 v0.8.5-pre-alpha — Actions Reference

**Milestone Goal:** DM reference for all PF2e actions — import basic, skill, exploration, and downtime actions from Foundry VTT into SQLite, add an Actions catalog page with category tabs and expandable description cards.

- [x] **Phase 31: Actions Import Pipeline** — DB migration `actions` table + extractAndInsertActions keyed by Foundry folder ID + shared/api/actions.ts (completed 2026-04-02)
- [x] **Phase 32: Actions Reference Page** — `/actions` page with search, Basic/Skill/Exploration/Downtime tabs, ActionCard with cost badge and full description (completed 2026-04-02)

### Phase 31: Actions Import Pipeline
**Goal**: All DM-relevant PF2e actions stored in SQLite with category context
**Plans**: 1 plan
Plans:
- [x] 31-01-PLAN.md — DB migration + extractAndInsertActions (FOLDER_TO_CATEGORY map) + shared/api/actions.ts

### Phase 32: Actions Reference Page
**Goal**: DM can browse and search all PF2e actions by category
**Plans**: 1 plan
Plans:
- [x] 32-01-PLAN.md — ActionsPage with search + tabs; ActionCard with ◆/↩/◇ cost badge, traits, description; router + nav
**UI hint**: yes

## Progress (v0.8.5)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 31. Actions Import Pipeline | v0.8.5 | 1/1 | Complete | 2026-04-02 |
| 32. Actions Reference Page | v0.8.5 | 1/1 | Complete | 2026-04-02 |

### 🚧 v0.9.0-pre-alpha — Items Catalog Overhaul

**Milestone Goal:** Overhaul the Items page with a production-quality catalog — fix FTS5 search/filter bugs, add Favorites system, ItemReferenceDrawer, multi-filter panel with traits/source/subcategory, column sorting, and wire EquipmentBlock item names to the drawer.

- [x] **Phase 34: Items Catalog Overhaul** — Fix search/filter bugs, add Favorites tab, ItemReferenceDrawer, full filter panel (type/level/rarity/traits/source/subcategory), column sorting, EquipmentBlock item links
 (completed 2026-04-03)
- [x] **Phase 35: UX Polish + Starfinder Purge + Encounter Tabs** — Items table proportional flex columns + Rarity, Starfinder content purge, trait filter chips, VS Code-style encounter tabs with independent combat state (completed 2026-04-03)

### Phase 34: Items Catalog Overhaul
**Goal**: Items page is a production-quality reference catalog — FTS5 search and filter bugs fixed, Favorites system with SQLite persistence, ItemReferenceDrawer showing full item details, multi-filter panel (type/level/rarity/traits/source/subcategory), column sorting by level and price, and EquipmentBlock item names clickable to open the drawer
**Depends on**: Phase 32
**Requirements**: null
**Success Criteria** (what must be TRUE):
  1. FTS5 search returns correct results with no count flicker — stale results cleared before new results shown
  2. All active filters (type, level, rarity, traits, source, subcategory) apply in a single DB round-trip
  3. Favorites tab shows favorited items grouped by category in collapsible sections; star toggle persists to `item_favorites` SQLite table
  4. Clicking any item name opens ItemReferenceDrawer with full stats, description, and favorites star
  5. Level and Price columns are sortable (↑↓ toggle, ArrowUp/ArrowDown icons); sort applied client-side
  6. EquipmentBlock in creature stat block has clickable item names that open ItemReferenceDrawer
**Plans:** 3/3 plans complete
Plans:
- [ ] 34-01-PLAN.md — DB migration (item_favorites + usage column), extend searchItems API, add filter/favorites queries, sync usage extraction, install @tanstack/react-virtual
- [ ] 34-02-PLAN.md — Zustand store + ItemFilterPanel + ItemsTable (virtualized) + ItemTableRow + ItemReferenceDrawer + rewrite ItemsPage with All Items tab
- [ ] 34-03-PLAN.md — FavoritesStar + FavoritesCategoryGroup + Favorites tab + EquipmentBlock clickable item names
**UI hint**: yes

### Phase 35: UX Polish + Starfinder Purge + Encounter Tabs
**Goal**: Items table columns balanced with proportional flex-[N] weights and new Rarity column; all Starfinder content purged from DB via Rust path filter + migration; trait filter shows selected chips below filter panel; combat page has VS Code-style encounter tab system with independent combat state per tab, blueprint selector, cross-tab drag&drop, and reset-to-blueprint
**Depends on**: Phase 34
**Requirements**: null
**Success Criteria** (what must be TRUE):
  1. Items table uses proportional flex-[N] columns with Rarity column; all text truncated; no horizontal overflow
  2. No Starfinder items, creatures, or other SF content appears anywhere in the app after sync
  3. Trait filter in Items page shows selected traits as visible removable chips below the filter panel
  4. Hazard search tab in CreatureSearchSidebar works correctly with encounter tabs (already implemented Phase 30)
  5. Combat page supports multiple open encounter tabs with independent combat state; blueprint selector; cross-tab drag&drop; reset to blueprint
**Plans:** 4/4 plans complete
Plans:
- [x] 35-01-PLAN.md — Items table proportional flex weights + Rarity column + trait filter chips
- [x] 35-02-PLAN.md — Starfinder content purge: Rust path filter in sync.rs + migration to truncate entity tables
- [x] 35-03-PLAN.md — Encounter tabs store (snapshot-swap) + tab bar + BlueprintSelectorDialog + CombatPage multi-tab
- [x] 35-04-PLAN.md — Cross-tab drag&drop + reset-to-blueprint + hazard UX verification

## Progress (v0.9.0)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 34. Items Catalog Overhaul | v0.9.0 | 3/3 | Complete    | 2026-04-03 |
| 35. UX Polish + Starfinder Purge + Encounter Tabs | v0.9.0 | 4/4 | Complete    | 2026-04-03 |

### 🚧 v0.9.6-pre-alpha — МАТЕМАТИКА (Dice Rolling + Condition Math)

**Milestone Goal:** Implement PF2e dice rolling system (d20 + modifier, damage formulas with crit/full/half) with a simple rotating cube animation and session-only roll history, then wire the engine's modifier/statistics math to auto-apply condition penalties (Frightened, Clumsy, etc.) to the combat tracker UI.

- [x] **Phase 36: Roll Foundation** — RollStore (Zustand, session-only), dice formula parser (`2d6+4`), `rollDice()` utility, base Roll types. Pure TS, no UI. (completed 2026-04-04)
- [x] **Phase 37: Dice UI + History** — Rotating cube animation (CSS/JS), RollResultToast, RollHistoryPanel (collapsible, clearable) (completed 2026-04-04)
- [ ] **Phase 38: Clickable Rolls** — All attack modifiers + damage formulas clickable; crit/full/half display for save-based damage; MAP counter per combatant per round
- [ ] **Phase 39: Condition Math** — Wire engine `modifiers/` + `statistics/` to combat tracker; auto-apply Frightened/Clumsy/etc. penalties; show modified values in UI

### Phase 36: Roll Foundation
**Goal**: Session-only RollStore (Zustand), dice formula parser (`"2d6+4"` → parsed parts), `rollDice(formula)` utility that resolves to individual die results + total, and typed Roll interfaces — all pure TypeScript with zero UI
**Depends on**: Phase 35
**Requirements**: null
**Success Criteria** (what must be TRUE):
  1. `rollDice("2d6+4")` returns individual die values, modifier, and total — deterministic when seeded, random in production
  2. RollStore holds session-only roll history (array of Roll records), clearable, no persistence
  3. Formula parser handles all PF2e damage patterns: `1d6`, `2d8+5`, `1d4+1d6`, negative modifiers, zero
  4. Roll types are exported from the engine or a shared types file — no circular imports
  5. No UI code in this phase — pure TS utilities and Zustand store only
**Plans:** 1/1 plans complete
Plans:
- [x] 36-01-PLAN.md — engine/dice/dice.ts (parser + rollDice + heightenFormula + Roll types) + engine barrel export + src/shared/model/roll-store.ts (Zustand session store with MAP tracking)

### Phase 37: Dice UI + History
**Goal**: Rotating cube animation component, RollResultToast showing die breakdown + total, and RollHistoryPanel (collapsible, clearable) integrated into the app layout
**Depends on**: Phase 36
**Requirements**: null
**Success Criteria** (what must be TRUE):
  1. Cube animation plays when a roll is triggered — simple fast-spin CSS effect, not a full 3D sim
  2. RollResultToast shows: formula, individual die values, modifier, total — dismissible
  3. RollHistoryPanel shows all rolls for the session; clearable; collapsible
  4. Panel integrated into combat page layout without breaking existing panels
**Plans:** 2/2 plans complete
Plans:
- [x] 37-01-PLAN.md — DiceCubeAnimation + RollResultToast + RollToastListener + RollDie20Button (shared/ui components + CSS keyframes)
- [x] 37-02-PLAN.md — RollHistoryPanel widget + AppHeader integration (global dice UI wiring)
**UI hint**: yes

### Phase 38: Clickable Rolls
**Goal**: All attack modifiers in the combat tracker are clickable (d20 + hit_bonus), damage formulas clickable with crit/full/half variants for save-based damage, MAP counter tracks attacks per combatant per round
**Depends on**: Phase 37
**Requirements**: null
**Success Criteria** (what must be TRUE):
  1. Every attack bonus in the stat block / combat tracker is clickable → triggers d20 + modifier roll
  2. Damage formulas clickable → triggers damage roll with breakdown
  3. Save-based damage shows three variants: Critical Hit (2×), Full, Half — user picks which to apply
  4. MAP counter visible per combatant; clicking attack auto-increments MAP; MAP penalty applied to next roll
  5. Spell/effect damage formulas clickable with the same crit/full/half UI

### Phase 39: Condition Math
**Goal**: Engine `modifiers/` + `statistics/` wired to combat tracker — condition penalties (Frightened, Clumsy, Drained, Enfeebled, Stupefied, Stunned) auto-applied to displayed attack/skill/save modifiers in the UI
**Depends on**: Phase 38
**Requirements**: null
**Success Criteria** (what must be TRUE):
  1. Frightened N → -N status penalty applied to all checks and DCs
  2. Clumsy N → -N status penalty to DEX-based rolls and AC
  3. Enfeebled N → -N status penalty to STR-based rolls
  4. Drained N → -N status penalty to CON-based rolls
  5. Modified values shown in UI (with tooltip showing base + penalty breakdown)
  6. Engine modifier stacking rules respected (status penalties don't stack)

## Progress (v0.9.6)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 36. Roll Foundation | v0.9.6 | 1/1 | Complete    | 2026-04-04 |
| 37. Dice UI + History | v0.9.6 | 2/2 | Complete    | 2026-04-04 |
| 38. Clickable Rolls | v0.9.6 | 0/? | Planned | — |
| 39. Condition Math | v0.9.6 | 0/? | Planned | — |

## Backlog

### Phase 999.1: Stat block card in combat tracker (FULFILLED)

**Goal:** Integrate the bestiary stat block card into the combat tracker — clicking a combatant in the tracker opens the same full stat block (with MAP, IWR, abilities, etc.) that's shown in the bestiary browser
**Status:** Fulfilled in Phase 15 (3-panel layout with stat card right panel)
**Plans:** Delivered as part of Phase 15-01-PLAN.md

### Phase 40: Dice Rolls Extended

**Goal:** Clickable rolls for skills, DC saves, spell attacks/damage, and item damage in the stat block; roll history enriched with source context (who/what/which combat); roll result drawer repositioned to right side
**Requirements**: null
**Depends on:** Phase 37
**Plans:** 1/1 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 40 to break down) (completed 2026-04-04)

### Phase 41: Encounters Page Redesign + Dual Combat View

**Goal:** Redesign the Encounters page with full BestiarySearchPanel-style search (creatures + hazards), drag-and-drop from search to encounter, hazards in saved encounters; modify combat tracker to support 2 open encounters side-by-side instead of tab-switching
**Requirements**: null
**Depends on:** Phase 35, Phase 40
**Plans:** 3/3 plans complete

Plans:
- [x] 41-01-PLAN.md — Hazard persistence (SQLite migration + types + API + EncounterEditor refactor)
- [x] 41-02-PLAN.md — 3-panel encounters page + dnd-kit drag-and-drop
- [x] 41-03-PLAN.md — Split combat view (dual encounter columns)

### 🚧 v1.0.0 — PC Import (Pathbuilder 2e)

**Milestone Goal:** Import player characters from Pathbuilder 2e JSON, display full PC sheet (stats, skills, equipment, spells, feats, DM notes), and add PCs to the combat tracker with full HP/condition tracking identical to NPCs.

- [x] **Phase 42: PC Data Pipeline** — SQLite `characters` table, Pathbuilder JSON parser, HP calculation, `shared/api/characters.ts` (completed 2026-04-05)
- [x] **Phase 43: Characters Page** — `/characters` route, CharactersList, import dialog (file + paste), delete, Add to Combat (completed 2026-04-06)
- [ ] **Phase 44: PC Sheet** — Core stats, skills, equipment, spellcasting, feats/specials, DM notes
- [ ] **Phase 45: Combat Integration** — PC in combat tracker with HP badge, AC, conditions, PC marker — no overrides

### Phase 42: PC Data Pipeline
**Goal**: Pathbuilder 2e JSON is fully parsed and stored in SQLite — characters table with raw JSON + indexed fields, HP calculation utility, all CRUD operations via shared/api/characters.ts
**Depends on**: Phase 41
**Requirements**: PCImp-01, PCImp-02, PCImp-03, PCImp-04
**Success Criteria** (what must be TRUE):
  1. `characters` table exists after migration with columns: id, name, class, level, ancestry, raw_json (TEXT), notes (TEXT), created_at
  2. Importing a valid Pathbuilder JSON (file or paste) stores the PC — re-import with same name updates the record
  3. `calculatePCMaxHP(build)` returns correct value: ancestryhp + (classhp + bonushp + CON_mod) × level
  4. `shared/api/characters.ts` exports: getAllCharacters, getCharacterById, upsertCharacter, deleteCharacter, updateCharacterNotes
**Plans:** 2/2 plans complete

### Phase 43: Characters Page
**Goal**: DM can browse all imported PCs, import new ones, delete, and add to active combat from the Characters page
**Depends on**: Phase 42
**Requirements**: CHAR-01, CHAR-02, CHAR-03
**Success Criteria** (what must be TRUE):
  1. `/characters` route shows all PCs as cards with name, class, level, ancestry visible
  2. Import dialog accepts file upload (.json) and paste — validates JSON structure before saving
  3. Deleting a PC removes it from the list (with confirmation prompt)
  4. "Add to Combat" button on a PC card adds it to the active encounter in combat tracker
**Plans:** 1/1 plans complete
**UI hint**: yes

### Phase 44: PC Sheet
**Goal**: Clicking a PC shows a full character sheet with all data from the Pathbuilder JSON — stats, skills, equipment, spells, feats, and editable DM notes
**Depends on**: Phase 43
**Requirements**: SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-05, SHEET-06
**Success Criteria** (what must be TRUE):
  1. Core stats panel shows: HP (calculated), AC, speed, all 6 ability scores with modifiers, fortitude/reflex/will saves, perception — all matching Pathbuilder values
  2. Skills panel shows all 18 skills + lores with proficiency rank label (T/E/M/L) and computed total modifier
  3. Equipment panel shows worn armor (with rune notation), weapons, inventory items grouped by container name
  4. Spellcasting panel shows each caster entry with tradition/type, spells grouped by level, focus cantrips/spells
  5. Feats & Features panel shows feats list (with type and level) and class specials
  6. DM notes field is editable inline and saves on blur/enter — persists to SQLite
**Plans:** TBD
**UI hint**: yes

### Phase 45: Combat Integration
**Goal**: PCs can be added to the combat tracker and tracked identically to NPCs — initiative, HP/tempHP, conditions, turn advancement; no spell/item overrides
**Depends on**: Phase 43
**Requirements**: CMB-01, CMB-02
**Success Criteria** (what must be TRUE):
  1. PC added to combat tracker appears with calculated max HP, AC displayed, PC badge visually distinct from NPC rows
  2. PC participates in turn order, HP/tempHP controls work identically to NPC, conditions can be added/removed
  3. No encounter override UI appears for PCs — no spell slot tracking, no item override buttons
**Plans:** TBD
**UI hint**: yes

## Progress (v1.0.0)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 42. PC Data Pipeline | v1.0.0 | 2/2 | Complete    | 2026-04-05 |
| 43. Characters Page | v1.0.0 | 1/1 | Complete    | 2026-04-06 |
| 44. PC Sheet | v1.0.0 | 0/? | Planned | — |
| 45. Combat Integration | v1.0.0 | 0/? | Planned | — |

---
*Roadmap created: 2026-03-31 — v0.2.2-pre-alpha fresh start*
*Last updated: 2026-04-05 — v1.0.0 PC Import milestone added (phases 42-45)
