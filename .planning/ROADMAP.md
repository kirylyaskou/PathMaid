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
- ✅ **v1.0.0 — PC Import (Pathbuilder 2e)** — Phases 42-46 (complete 2026-04-07)
- ✅ **v1.1.0 — PathMaid Day-One Patch** — Phases 47-54 (complete 2026-04-10)
- ✅ **v1.2.1 — Spell Effects + Custom Creatures** — Phases 56-59 (shipped 2026-04-17)
- ✅ **v1.3.0 — Encounter Import + Combat UX Refinement** — Phases 60-64 (shipped 2026-04-19)
- ✅ **v1.4.0 — Effects Deep Dive + PC Library + UX Unification** — Phases 65-70 (shipped 2026-04-20)
- ✅ **v1.5.0 — In-App Updater** — Phases 71-76 (shipped 2026-04-23, [archive](./milestones/v1.5.0-ROADMAP.md))
- ✅ **v1.6.0 — Spellcasting Deep Fix** — Phases 77-83 (shipped 2026-04-23, [archive](./milestones/v1.6.0-ROADMAP.md), [audit](./milestones/v1.6.0-MILESTONE-AUDIT.md))
- ✅ **v1.7.0 — Monster Translation** — Phases 84-89 (shipped 2026-04-24, [archive](./milestones/v1.7.0-ROADMAP.md))
- ✅ **v1.7.1 — pf2-locale-ru Migration** — Phases 90-95 (feature-complete 2026-04-25, replanned after rollback, NOT TAGGED, [archive](./milestones/v1.7.1-ROADMAP.md))
- ✅ **v1.7.2 — Translation Polish + Tech Debt** — Phases 96-101 (feature-complete 2026-04-25, NOT TAGGED, [archive](./milestones/v1.7.2-ROADMAP.md))
- ✅ **v1.7.3 — Strike Names + UI Shell + Item Surface Audit** — Phases 102-107 (feature-complete 2026-04-26, NOT TAGGED, [archive](./milestones/v1.7.3-ROADMAP.md))
- ✅ **v1.7.4 — Broad i18n Coverage + Tech Cleanup** — Phase 108 + global i18n sweep (feature-complete 2026-04-26, NOT TAGGED, [archive](./milestones/v1.7.4-ROADMAP.md))
- 🚧 **v1.7.5 — AP Bestiaries + Item-id RU + Special Abilities Coverage** — Phases 109+ (in planning, 2026-04-26)

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
- [x] **Phase 35: UX Polish + Starfinder Purge + Encounter Tabs** — Items table proportional flex columns + Rarity, Starfinder content purge, trait filter chips, VS Code-style encounter tabs with independent combat state
 (completed 2026-04-03)

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
**Plans:** 0/1 plans complete
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
- [x] **Phase 44: PC Sheet** — Full character sheet: core stats, skills, equipment, spellcasting, feats/specials, DM notes (completed 2026-04-07)
- [x] **Phase 45: Combat Integration** — PC in combat tracker with HP badge, AC, conditions, PC marker (completed 2026-04-07)
- [x] **Phase 46: PC Combat Polish** — 3-tab left panel (Bestiary/Hazards/Characters), PCCombatCard, inline initiative edit, encounter picker, hazard initiative roll button (completed 2026-04-07)

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
**Plans:** 3/3 plans complete

### Phase 46: PC Combat Polish
**Goal**: Combat tracker left panel has 3 tabs (Bestiary/Hazards/Characters), PC stat card shows in right panel on select, initiative is editable inline for all combatants, hazards have an initiative roll button
**Depends on**: Phase 45
**Requirements**: POLISH-01 (v1.0.0 late addition)
**Success Criteria** (what must be TRUE):
  1. Left panel has 3 toggle tabs: Bestiary, Hazards, Characters — active tab highlighted
  2. Selecting a PC in combat tracker shows PCCombatCard in right panel (not NPC stat block)
  3. Initiative values are editable inline for both NPCs and PCs
  4. "Add to Combat" on Characters page shows encounter picker when multiple encounters are open
  5. Hazard rows in combat tracker have a roll-initiative button
**Plans:** 4/4 plans complete

<details>
<summary>✅ v1.1.0 — PathMaid Day-One Patch (Phases 47-54) — SHIPPED 2026-04-10</summary>

**Milestone Goal:** Full rebrand to PathMaid, remove raw Foundry @-tokens, polish encounters UX, add goblin maid mascot, audit XP engine correctness, fix critical bugs, and run a full code quality audit before public release.

- [x] **Phase 47: Rebrand** — Rename Pathbuddy → PathMaid (completed 2026-04-07)
- [x] **Phase 48: Description Sanitization** — Remove all Foundry @-tokens from descriptions (completed 2026-04-07)
- [x] **Phase 49: Encounters UX Overhaul** — New Encounter button, extended filters, level-sorted lists (completed 2026-04-08)
- [x] **Phase 50: Mascot Integration** — Goblin maid GIF on SplashScreen, sync overlay, Dashboard empty state (completed 2026-04-09)
- [x] **Phase 51: XP Audit** — XP budget and group level calculator corrected to PF2e CRB rules (completed 2026-04-09)
- [x] **Phase 52: Bug Fixes** — 15+ fixes including initiative restore, dice toasts, stat block modal, MAP, wounded rules (completed 2026-04-09)
- [x] **Phase 53: Code Audit** — 19 dead components removed, FSD fixed, tsc = 0 (completed 2026-04-10)
- [x] **Phase 54: Linux/Android CI/CD** — CI lint+tsc + Release with Android APK (completed 2026-04-10)

Full details: `.planning/milestones/v1.1.0-ROADMAP.md`

</details>

## Progress

### v1.0.0 — PC Import (Pathbuilder 2e)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 42. PC Data Pipeline | 2/2 | Complete | 2026-04-05 |
| 43. Characters Page | 1/1 | Complete | 2026-04-06 |
| 44. PC Sheet | 3/3 | Complete | 2026-04-07 |
| 45. Combat Integration | 3/3 | Complete | 2026-04-07 |
| 46. PC Combat Polish | 4/4 | Complete | 2026-04-07 |

### v1.1.0 — PathMaid Day-One Patch (SHIPPED 2026-04-10)

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 47. Rebrand | 1/1 | Complete | 2026-04-07 |
| 48. Description Sanitization | 1/1 | Complete | 2026-04-07 |
| 49. Encounters UX Overhaul | 3/3 | Complete | 2026-04-08 |
| 50. Mascot Integration | 2/2 | Complete | 2026-04-09 |
| 51. XP Audit | 3/3 | Complete | 2026-04-09 |
| 52. Bug Fixes | 8/8 | Complete | 2026-04-09 |
| 53. Code Audit | 2/2 | Complete | 2026-04-10 |
| 54. Linux/Android CI/CD | 2/2 | Complete | 2026-04-10 |

### v1.2.0 — Spell Effects + Custom Creatures (SHIPPED 2026-04-17)

Archived — see `.planning/milestones/v1.2.1-ROADMAP.md`

### v1.3.0 — Encounter Import + Combat UX Refinement (SHIPPED 2026-04-19)

Archived — see `.planning/milestones/v1.3.0-ROADMAP.md`

<details><summary>v1.3.0 phase details</summary>

**Milestone Goal:** Encounter import, combat entry flow, effect/spellcasting UX polish, rules engine regressions

- [ ] **Phase 60: Effect Rules Engine Fix** — FlatModifier `attack` selector regression + audit PF2e canonical selectors
- [ ] **Phase 61: Effect Picker UX** — Widened modal, category groups, context-filtered default, global search, live-refresh
- [ ] **Phase 62: Spellcasting UX Refactor** — Informational slots, edit mode, unified component
- [ ] **Phase 63: Combat Entry Flow + Refresh Semantics** — Encounter-as-template, Start gate, Info panel, dedup dialog
- [ ] **Phase 64: Encounter Import** — Pathmaiden JSON + Pathfinder Dashboard JSON, preview dialog

### Phase 60: Effect Rules Engine Fix
**Goal**: Исправить регрессию — FlatModifier с selector: "attack" (Bane и подобные) корректно применяется к attack rolls; провести аудит покрытия PF2e canonical selectors в engine selector resolver
**Depends on**: Nothing (engine-only, no UI dependencies)
**Requirements**: EFFECT-RULES-01, EFFECT-RULES-02
**Success Criteria** (what must be TRUE):
  1. Применив Bane к комбатанту в combat tracker, пользователь видит -1 status penalty на Strike-атаках этого комбатанта
  2. Все PF2e canonical селекторы (attack, ac, all-saves, fortitude, reflex, will, skill-check, damage, spell-attack, spell-dc, class-dc) обрабатываются явно в resolveSingleSelector
  3. pnpm tsc --noEmit и pnpm lint — 0 ошибок
**Plans:** 1 plan
Plans:
- [ ] 60-01-PLAN.md — Selector-resolver canonical cases (attack/all-saves/skill-check/spell-attack/class-dc/damage) + spell-attack virtual slug в UI

</details>

### v1.4.0 — Effects Deep Dive + PC Library + UX Unification (SHIPPED 2026-04-20)

Archived — see `.planning/milestones/v1.4.0-ROADMAP.md`

<details><summary>v1.4.0 phase details</summary>

**Milestone Goal:** Вывести движок эффектов PF2e за пределы FlatModifier/Resistance — поддержка RollOption/AdjustStrike/BattleForm/Note/GrantItem + predicate evaluator для условных модификаторов. Унифицировать Spellcasting UI между combat detail и custom creature builder. Cast→Target→Apply flow с multi-target. Paizo iconics + adventure pregens как готовые PC/NPC. Encounter export в Pathmaiden JSON.

- [ ] **Phase 65: Rule Engine Expansion** — RollOption / AdjustStrike / BattleForm / Note / GrantItem + pack coverage audit
- [ ] **Phase 66: Predicate Evaluator** — DSL parser + state bridge + integration into modifier pipeline (Acid Grip regression)
- [ ] **Phase 67: Spellcasting UX Unification** — Shared SpellcastingEditor component used by combat detail and custom creature builder
- [ ] **Phase 68: Cast → Target → Apply Flow** — Cast button, target picker with allegiance, multi-target, applies parent effect + consumes slot
- [ ] **Phase 69: Encounter Export** — .pathmaiden JSON download from /encounters page + round-trip re-import
- [ ] **Phase 70: Paizo Library Import** — Iconics + adventure pregens synced as both NPC and PC, with source filter in pickers

### Phase 65: Rule Engine Expansion
**Goal**: Effects beyond FlatModifier/Resistance apply mechanically — RollOption/AdjustStrike/BattleForm/Note/GrantItem rule types are implemented in the engine pipeline, and every rule type present in the 3 allow-listed packs has engine support or is explicitly logged as ignored
**Depends on**: Nothing (engine work, no cross-phase deps inside v1.4)
**Requirements**: RULE-01, RULE-02, RULE-03, RULE-04, RULE-05, RULE-06
**Success Criteria** (what must be TRUE):
  1. Apply Sure Strike to a combatant → the next Strike roll uses fortune (2d20 keep highest); apply Assurance → the next skill check resolves to the flat DC value
  2. Apply Enlarge → the combatant's damage tooltip shows one step up on a selected damage die AND the combatant's size badge increments one category
  3. Apply an effect carrying a Note rule → the RollResultToast shows the note text attached to matching rolls
  4. Apply Rage (GrantItem parent) → the granted sub-effect appears in the Effects section automatically and its modifiers stack correctly
  5. An audit report lists every rule type found across spell-effects / equipment-effects / boons-and-curses packs with counts and "supported | ignored" status
**Plans**: TBD

### Phase 66: Predicate Evaluator
**Goal**: Conditional modifiers fire only when their predicate holds against live combatant state — the DSL parser, state bridge, and modifier pipeline integration all work end-to-end
**Depends on**: Phase 65 (extends the modifier pipeline rule-types now emit into)
**Requirements**: PRED-01, PRED-02, PRED-03, PRED-04
**Success Criteria** (what must be TRUE):
  1. Predicates with nested {and,or,not} combinators and self:/target:/item: atoms parse without crashes and evaluate deterministically
  2. For any combatant, the state bridge exposes live facts — active conditions (with values), effect slugs, creature traits, persistent-damage types — that predicates can query
  3. A FlatModifier with an unmet predicate is absent from the net-total; the modifier tooltip shows "inactive — requires X" with the specific failing atom
  4. Acid Grip regression: applying persistent acid damage to the target live-enables its -10 speed penalty; removing persistent acid live-disables it without resetting the effect
**Plans**: TBD

### Phase 67: Spellcasting UX Unification
**Goal**: Spellcasting editing lives in one component used by two callsites — combat detail (DB-backed) and custom creature builder (reducer-backed) — with no persistence branching inside the shared code
**Depends on**: Nothing (UI refactor, independent of rule-engine work)
**Requirements**: SPELLCAST-U-01, SPELLCAST-U-02
**Success Criteria** (what must be TRUE):
  1. features/spellcasting-editor/ exports one SpellcastingEditor component that renders slot editor + spell list editor + rank editor
  2. CombatantDetail spellcasting section uses the shared component and persists edits through encounter_slot_overrides and encounter_combatant_spells unchanged
  3. Custom Creature Builder SpellcastingTab uses the same component and persists edits through the existing reducer — no duplicate UI code remains
  4. The shared component receives all persistence via props/callbacks; grep for encounter_ or creatureReducer inside features/spellcasting-editor/ returns nothing
**Plans**: TBD
**UI hint**: yes

### Phase 68: Cast → Target → Apply Flow
**Goal**: Casting a spell that carries a linked effect becomes a single GM action — click Cast, pick target(s), effect is applied and the slot is consumed
**Depends on**: Phase 67 (hosts the Cast button on the unified spellcasting surface)
**Requirements**: APPLY-01, APPLY-02, APPLY-03, APPLY-04
**Success Criteria** (what must be TRUE):
  1. In CombatantDetail, spell rows with a linked spell_effects row render a Cast button; spell rows without linked effects do not
  2. Clicking Cast opens a target picker listing current-encounter combatants grouped as PCs / NPC allies / NPC enemies relative to the caster, with a sensible default (buffs → allies, debuffs → enemies) and manual override
  3. For a 3-action Heal (or any spell whose metadata declares target count >1) the picker switches to checkbox mode honoring the declared max; single-target spells stay single-select
  4. Committing the selection applies the parent effect to each chosen target via the existing applyEffectToCombatant path and consumes the caster's slot via the existing used_count / prepared-cast plumbing
**Plans**: TBD
**UI hint**: yes

### Phase 69: Encounter Export
**Goal**: Any saved encounter can be downloaded as a shareable .pathmaiden JSON and re-imported losslessly in another install
**Depends on**: Nothing (parser shipped in v1.3 Phase 64)
**Requirements**: EXPORT-01, EXPORT-02
**Success Criteria** (what must be TRUE):
  1. Each encounter card on /encounters page has an Export action that downloads a .pathmaiden file conforming to the pathmaiden-v1 schema
  2. Re-importing the exported file via the existing Import button reconstructs the combatant list (bestiary / custom / hazard) matched by name with correct display names, HP, initiative, and weak/elite tiering
**Plans**: TBD

### Phase 70: Paizo Library Import
**Goal**: Paizo iconics and adventure pregens are available as both pre-built NPCs and importable PCs, discoverable in the sidebar and character picker with a source filter
**Depends on**: Nothing (sync-pipeline extension, independent of everything else)
**Requirements**: LIBRARY-01, LIBRARY-02, LIBRARY-03, LIBRARY-04
**Success Criteria** (what must be TRUE):
  1. After sync, the Bestiary contains the full set of iconics (Amiri, Ezren, Feiya, Harsk, Kyra, Lem, Lini, Merisiel, Sajan, …) with full stat blocks, AND the Characters page shows the same iconics as PCs with PCSheet rendering without crashes
  2. After sync, each paizo-pregens/<adventure>/ subfolder appears as both NPC entries in the Bestiary and PC records on Characters page, tagged with their adventure source
  3. CreatureSearchSidebar and the character picker both surface iconics/pregens alongside bestiary/custom entries, with a source filter chip that narrows to iconics only or to a single adventure's pregens
  4. Imported PC data preserves class / level / ancestry / feats / equipment / spells where the JSON provides them; missing fields fall back to safe defaults and PCSheet renders without crashes
**Plans**: TBD
**UI hint**: yes

</details>

### v1.4.0 Progress (COMPLETE)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 65. Rule Engine Expansion | 1/1 | Complete | 2026-04-19 |
| 66. Predicate Evaluator | 1/1 | Complete | 2026-04-19 |
| 67. Spellcasting UX Unification | 1/1 | Complete | 2026-04-19 |
| 68. Cast → Target → Apply Flow | 1/1 | Complete | 2026-04-19 |
| 69. Encounter Export | 1/1 | Complete | 2026-04-19 |
| 70. Paizo Library Import | 1/1 | Complete | 2026-04-19 |

---

### ✅ v1.5.0 — In-App Updater (SHIPPED 2026-04-23)

Phases 71-76 — ed25519 signing, tauri-plugin-updater + process, shared/api/updater.ts, UpdateDialog + Settings UI, startup auto-check, v1.5.0 release.

Full details: [`.planning/milestones/v1.5.0-ROADMAP.md`](./milestones/v1.5.0-ROADMAP.md)

### ✅ v1.6.0 — Spellcasting Deep Fix (SHIPPED 2026-04-23)

Phases 77-83 — cantrip rank safety net, castType UI split, heightening preview + persistence, use-spellcasting facade split, @item.level cast-rank, FSD migration, innate frequency parsing.

Full details: [`.planning/milestones/v1.6.0-ROADMAP.md`](./milestones/v1.6.0-ROADMAP.md) · Audit: [`.planning/milestones/v1.6.0-MILESTONE-AUDIT.md`](./milestones/v1.6.0-MILESTONE-AUDIT.md)

### ✅ v1.7.0 — Monster Translation (SHIPPED 2026-04-24)

Phases 84-89 — HTML→structured parser (native DOMParser, zero deps), migration `0041`/`0042`/`0043` (structured_json column + RU FTS5 denormalization), bundled loader integration, typed API + hook surface, `CreatureStatBlock` overlay wiring + markdown-lite renderer, use-spellcasting facade trim (119 → 99 lines).

Full details: [`.planning/milestones/v1.7.0-ROADMAP.md`](./milestones/v1.7.0-ROADMAP.md)

Post-ship hotfixes (same day): Collapsible wrapper bug, RU FTS5 search, spellcasting heading removal — see archive doc.

Carryover to v1.7.1: UI Translation Dictionaries (structural labels HP/AC/Saves, 17-skill dict, ~25 languages, ~60 traits).

### 🚧 v1.7.1 — pf2-locale-ru Migration (In Progress, Replanned 2026-04-25)

**Milestone Goal:** Заменить v1.7.0 HTML-parser-based RU translation на прямой ingest из community Foundry locale module `pf2-locale-ru`. Single source of truth: vendored `vendor/pf2e-locale-ru/` под OGL 1.0a + Paizo Community Use Policy. Drop pf2.ru. Drop manual authoring. Drop HTML parser (`parse-monster.ts`).

**Architectural shift:** v1.7.0 path «pf2.ru → HTML parse → structured_json» → v1.7.1 path «pf2-locale-ru pack JSON → adapter → structured_json». Существующая `structured_json` shape (Phase 87 column + Phase 88 sub-component contracts) сохраняется через adapter layer — UI consumers не переписываются.

**History:** Original v1.7.1 plan (Dictionary Foundation, DICT-01..05) был **rolled back 2026-04-25** после обнаружения false attribution в AI-generated `traits.ts` / `languages.ts` (claiming `Source: pf2.ru/rules/traits` без реального fetch). Replanned as E1 architecture с canonical community source.

- [x] **Phase 90: Vendor pf2-locale-ru + License Disclosure** — copy selected pack files под `vendor/pf2e-locale-ru/`; add OGL 1.0a + Paizo CUP + Section 15 attribution под `LICENSES/`; About-page UI с license disclosure (completed 2026-04-25)
- [x] **Phase 91: Ingest Adapter + DB Population** — pack→`structured_json` adapter; drop `parse-monster.ts` HTML parser; drop bundled `monster.json`/`spell.json`/etc.; rewrite `loadContentTranslations` (completed 2026-04-25)
- [x] **Phase 92: Dictionary Modules from pf2e.json** — derive `dictionaries/{skills,languages,traits,sizes}.ts` from `vendor/pf2e-locale-ru/pf2e/pf2e.json` PF2E.* keys (17 skills + 174 languages + 892 trait labels + 501 trait descriptions + 6 sizes) (completed 2026-04-25)
- [x] **Phase 93: Wire UI Consumers** — TraitPill + Skills + Languages + Statblock labels + Subtitle + RK DC dynamic content consume index API (completed 2026-04-25)
- [x] **Phase 94: Untranslated Badge** — «🚫RU» indicator top-right corner для monsters/spells без pack entry (completed 2026-04-25)
- [x] **Phase 95: Spell Migration + UAT + Cleanup** — spells from `spells-srd.json` pack; multi-monster smoke; remove dead HTML parser code; final docs (completed 2026-04-25)

### Phase 90: Vendor pf2-locale-ru + License Disclosure
**Goal**: Selected pf2-locale-ru content vendored в repo с full OGL 1.0a + Paizo CUP attribution.
**Depends on**: Nothing
**Requirements**: VENDOR-01, VENDOR-02, VENDOR-03, VENDOR-04
**Files**:
- `vendor/pf2e-locale-ru/pf2e/pf2e.json` (UI strings)
- `vendor/pf2e-locale-ru/pf2e/packs/{mapping.json,pathfinder-monster-core.json,pathfinder-monster-core-2.json,pathfinder-bestiary.json,pathfinder-bestiary-2.json,pathfinder-bestiary-3.json,pathfinder-npc-core.json,npc-gallery.json,bestiary-ability-glossary-srd.json,bestiary-family-ability-glossary.json,bestiary-effects.json,spells-srd.json,actionspf2e.json,conditionitems.json,equipment-srd.json,feats-srd.json,feat-effects.json,equipment-effects.json,spell-effects.json}` (~25-30 MB raw)
- `vendor/pf2e-locale-ru/VERSION.txt` (git SHA + date + source URL)
- `LICENSES/OGL-1.0a.txt` (mandatory full text per OGL §10)
- `LICENSES/PAIZO-COMMUNITY-USE.md` (Paizo CUP disclaimer)
- `LICENSES/OGL-SECTION-15.md` (Section 15 COPYRIGHT NOTICE chain)
- `LICENSES/pf2-locale-ru-CONTRIBUTORS.md` (community attribution + source URL)
- About-page UI (new или extension Settings page)
- README.md update с license disclosure pointer

**Success Criteria**:
1. `vendor/pf2e-locale-ru/` exists с минимум-pack scope (≥18 pack файлов + pf2e.json + mapping.json + VERSION.txt)
2. Все 4 LICENSES/* файла committed; OGL-1.0a.txt = exact copy WoTC text; SECTION-15.md содержит full COPYRIGHT chain из pf2-locale-ru source
3. About-page UI accessible в running app (через Settings или как separate route)
4. About-page содержит: PathMaid software license, OGL 1.0a + Paizo CUP disclaimer, pf2-locale-ru attribution + version SHA
5. README.md links to LICENSES/ directory; product disclaimer footer «Not endorsed by Paizo»
6. `pnpm tsc --noEmit` = 0; `pnpm lint` = 0 new errors


**Plans**: 6 plans
- [x] 90-01-PLAN.md — Vendor file copy + VERSION.txt (Wave 1, parallel)
- [x] 90-02-PLAN.md — LICENSES/ creation (4 files; Wave 1, parallel)
- [x] 90-03-PLAN.md — Vite/tsconfig @vendor alias (Wave 2)
- [x] 90-04-PLAN.md — SettingsPage About section + i18n keys (Wave 3)
- [x] 90-05-PLAN.md — README.md disclosure block (Wave 3, parallel с 04)
- [x] 90-06-PLAN.md — Build verification + manual smoke (Wave 4)

### Phase 91: Ingest Adapter + DB Population
**Goal**: HTML parser удалён, bundled JSONs удалены, `structured_json` populated через pack adapter.
**Depends on**: Phase 90 (vendor source available)
**Requirements**: INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05 (partial)
**Files**:
- `src/shared/i18n/pf2e-content/ingest/pack-adapter.ts` (new)
- `src/shared/i18n/pf2e-content/ingest/index.ts` (new — orchestrates adapter + bundles via `import.meta.glob`)
- `src/shared/i18n/pf2e-content/index.ts` (rewrite `loadContentTranslations`)
- `src/shared/i18n/pf2e-content/lib/parse-monster.ts` (DELETED)
- `src/shared/i18n/pf2e-content/lib/parse-monster.debug.ts` (DELETED)
- `src/shared/i18n/pf2e-content/{monster,spell,action,feat,item}.json` (DELETED)
- `src/shared/i18n/pf2e-content/lib/types.ts` (preserve `MonsterStructuredLoc` shape — adapter target)

**Success Criteria**:
1. `pack-adapter.ts` produces `MonsterStructuredLoc` matching Phase 87 contract (passes type checks against existing CreatureStatBlock consumer)
2. `parse-monster.ts` + `.debug.ts` files removed; 0 references в codebase
3. 5 bundled JSON files removed; `loadContentTranslations` reads vendored pack files instead
4. `translations` table populated с pack-derived `structured_json` для всех монстров covered by vendored bestiary packs (≥492 monsters from Monster Core)
5. Existing FTS5 RU denormalization (Phase 86 path) продолжает работать с new data path
6. Drizzle migrations unchanged (no new migration needed)
7. `pnpm tsc --noEmit` = 0; `pnpm lint` = 0 new errors

### Phase 92: Dictionary Modules from pf2e.json
**Goal**: Derive runtime dictionaries из `vendor/pf2e-locale-ru/pf2e/pf2e.json` для UI consumers.
**Depends on**: Phase 90 (vendored source)
**Requirements**: INGEST-05 (full)
**Files**:
- `src/shared/i18n/pf2e-content/dictionaries/skills.ts` (new — `PF2E.Skill.*`)
- `src/shared/i18n/pf2e-content/dictionaries/languages.ts` (new — `PF2E.Actor.Creature.Language.*`)
- `src/shared/i18n/pf2e-content/dictionaries/traits.ts` (new — `PF2E.Trait*` + `PF2E.TraitDescription*`)
- `src/shared/i18n/pf2e-content/dictionaries/sizes.ts` (new — `PF2E.ActorSize*`)
- `src/shared/i18n/pf2e-content/index.ts` (extend with index API)
- `scripts/derive-pf2e-dicts.ts` (optional build-time generator)

**Success Criteria**:
1. `dictionaries/skills.ts` covers 17 PF2e core skills byte-identical с pf2e.json values (Acrobatics→Акробатика, Arcana→Аркана, Performance→Выступление и т.д.)
2. `dictionaries/languages.ts` covers 174 languages (full pf2-locale-ru coverage)
3. `dictionaries/traits.ts` covers 892 trait labels + 501 descriptions (Foundry slug keys lowercase)
4. `dictionaries/sizes.ts` covers 6 sizes (Tiny→Крошечный..Gargantuan→Исполинский)
5. Index API в `index.ts` exports `getTraitLabel`, `getTraitDescription`, `getSkillLabel`, `getLanguageLabel`, `getSizeLabel` — все return string fallback при miss (no console.warn в prod)
6. Все dict modules имеют JSDoc attribution с reference на `vendor/pf2e-locale-ru/pf2e/pf2e.json` + version SHA — НЕ pf2.ru
7. `pnpm tsc --noEmit` = 0; `pnpm lint` = 0 new errors

### Phase 93: Wire UI Consumers
**Goal**: UI компоненты consume Phase 92 index API + adapter output из Phase 91.
**Depends on**: Phase 91 + Phase 92
**Requirements**: WIRE-01, WIRE-02, WIRE-03, WIRE-04, WIRE-05, WIRE-06; partial SPELL-01
**Files**:
- `src/shared/ui/trait-pill.tsx` (TraitPill + tooltip wiring через getTraitLabel/getTraitDescription)
- `src/entities/creature/ui/CreatureStatBlock.tsx` (subtitle TRAITS lookup; RK DC dynamic; structural label decision per WIRE-04)
- `src/entities/creature/ui/CreatureSkillsLine.tsx` (getSkillLabel inline)
- `src/entities/creature/ui/CreatureStrikeRow.tsx` + `src/shared/ui/ability-card.tsx` (TraitList consolidation если ещё нужно)
- `src/entities/creature/ui/SpellListPreview.tsx` + `src/entities/spell/ui/SpellInlineCard.tsx` (если spell rendering wiring touched)
- `src/shared/i18n/locales/ru/common.json` (decision per WIRE-04 (a)/(b))

**Success Criteria**:
1. Succubus @ locale=ru: subtitle = «СРЕДНИЙ БЕС» (size+type через TRAITS dict — note: `fiend → Бес` per pf2-locale-ru, NOT `Нечестивый`)
2. Header trait pills RU labels через `getTraitLabel`
3. Hover на trait с description: tooltip показывает RU description через `getTraitDescription`
4. Hover на rarity/size pill: NO tooltip (description=null)
5. RK DC line: «Знания DC 24 • Бес (Религия)» — type через TRAITS dict, skill через getSkillLabel
6. 17 skills always-on RU при locale=ru независимо от parser overlay
7. Languages row RU per token; unknown → EN silent fallback
8. locale=en → zero visual diff (SC4 regression guard)
9. Strike trait pills + ability trait pills RU

### Phase 94: Untranslated Badge
**Goal**: Visual indicator для monsters/spells без pack translation.
**Depends on**: Phase 91
**Requirements**: UNTRANS-01, UNTRANS-02; partial SPELL-03
**Files**:
- `src/shared/ui/no-translation-badge.tsx` (new — «🚫RU» component)
- `src/entities/creature/ui/CreatureStatBlock.tsx` (top-right absolute badge при !translation && locale=ru)
- `src/entities/creature/ui/CreatureCard.tsx` (compact + full variants)
- `src/entities/spell/ui/SpellInlineCard.tsx` (если applies)

**Success Criteria**:
1. NoTranslationBadge component renders в top-right corner с styling (red/gray, strikethrough «RU»)
2. Tooltip on badge: «Этот монстр не переведён в pf2-locale-ru»
3. Detection: badge shown ONLY when `getMonsterTranslation(name, level, 'ru') === null` AND `locale === 'ru'`
4. CreatureStatBlock + CreatureCard (compact + full) wire badge
5. locale=en → badge никогда не показывается
6. Smoke test: known untranslated creature shows badge; translated creature does not

### Phase 95: Spell Migration + UAT + Cleanup
**Goal**: Spells consumed из pack data; final smoke + cleanup.
**Depends on**: Phase 91 + Phase 93 + Phase 94
**Requirements**: SPELL-01, SPELL-02, SPELL-03; final DEBT-02
**Files**:
- `src/entities/spell/ui/SpellInlineCard.tsx`, `SpellReferenceDrawer.tsx`, `SpellListPreview.tsx`
- `src/shared/api/translations.ts` (если spell read path needs adjustment)
- Cleanup: any leftover dead code references к v1.7.0 HTML parser path
- Documentation: README, About-page final pass

**Success Criteria**:
1. «Кислотная хватка» renders с полным RU description; formatting blocks (Crit Success / Success / Failure / Crit Failure / Heightened +2) разделены corretly
2. Smoke test минимум 5 monsters across 2-3 different bestiaries: all stat blocks RU at locale=ru; all EN at locale=en
3. Untranslated entities show «🚫RU» badge
4. `git grep -E "parse-monster|parseMonster"` = 0 occurrences
5. `git grep "pf2.ru"` returns only LICENSES context references — no fabrication-style attribution в src/
6. README + About-page final review (license disclosure prominent)
7. Multi-monster human UAT signed off

### v1.7.1 Progress

| Phase | Plans Complete | Status | Started |
|-------|----------------|--------|---------|
| 90. Vendor + License | 6/6 | Complete    | 2026-04-25 |
| 91. Ingest Adapter | 5/5 | Complete    | 2026-04-25 |
| 92. Dictionary Modules | 0/5 | Complete    | 2026-04-25 |
| 93. Wire UI Consumers | 0/5 | Complete    | 2026-04-25 |
| 94. Untranslated Badge | 0/0 | Complete    | 2026-04-25 |
| 95. Spell + UAT + Cleanup | 0/0 | Complete    | 2026-04-25 |

**Dependency graph:**
- Phase 90 (vendor) — pure prerequisite
- Phase 91 (ingest) depends on 90
- Phase 92 (dicts) depends on 90 (parallel с 91)
- Phase 93 (UI wiring) depends on 91 + 92
- Phase 94 (badge) depends on 91
- Phase 95 (UAT + cleanup) depends на все предыдущие

**Parallelization hint:** Phases 91 + 92 могут идти параллельно после Phase 90. Phase 93 + 94 могут идти параллельно после 91/92.

---
*Roadmap created: 2026-03-31 — v0.2.2-pre-alpha fresh start*
*Last updated: 2026-04-25 — v1.7.1 replanned as E1 (pf2-locale-ru migration; Phases 90-95)*

---

## v1.7.2 — Translation Polish + Tech Debt

**Goal:** Закрыть блокеры релиза v1.7.1: paragraph spacing bug + 5 tech-debt items.

### Phase 96: Spell description paragraph spacing fix
**Goal**: SpellReferenceDrawer renders `<p>` blocks visibly separated.
**Depends on**: Phase 95
**Requirements**: POLISH-01
**Files**:
- `src/app/styles/globals.css` (scope-up `.pf2e-safe-html p` rule or use Tailwind layer)

**Success Criteria**:
1. Visual gap between consecutive `<p>` blocks ≥0.5rem
2. Hr separators preserved
3. Existing creature description rendering not regressed

### Phase 97: Orphan pf2.ru rows cleanup on boot
**Goal**: One-shot DELETE стирает stale `source='pf2.ru'` rows.
**Depends on**: Phase 91
**Requirements**: CLEAN-01
**Files**:
- `src/shared/i18n/pf2e-content/index.ts` (loader prepends DELETE)

**Success Criteria**:
1. After first boot: `SELECT COUNT(*) FROM translations WHERE source='pf2.ru'` = 0
2. INSERT idempotency unaffected (skip-gate still works)

### Phase 98: Spell-side untranslated badge slot
**Goal**: SpellReferenceDrawer header shows 🚫RU when untranslated.
**Depends on**: Phase 94 (NoTranslationBadge component) + Phase 95 (spell ingest)
**Requirements**: SPELL-STRUCT-03
**Files**:
- `src/entities/spell/ui/SpellReferenceDrawer.tsx` (top-right absolute slot in header)

**Success Criteria**:
1. Spells without pack entry show badge при locale=ru
2. locale=en → badge hidden
3. Translated spells (e.g. Acid Grip) → no badge

### Phase 99: Strike + ability trait pills migration
**Goal**: CreatureStrikeRow + AbilityCard render traits через TraitPill.
**Depends on**: Phase 93 (TraitPill+tooltip)
**Requirements**: POLISH-02
**Files**:
- `src/entities/creature/ui/CreatureStrikeRow.tsx` (line ~159 traits map)
- `src/shared/ui/ability-card.tsx` (traits prop render)

**Success Criteria**:
1. Strike trait pills render через TraitPill — RU labels + tooltips visible
2. Ability trait pills render через TraitPill
3. Existing traits styling preserved (uppercase, secondary bg)

### Phase 100: Item-shaped pack ingest family
**Goal**: actions / feats / equipment / conditions ingest from vendored packs.
**Depends on**: Phase 95
**Requirements**: INGEST-FAMILY-01, INGEST-FAMILY-02
**Files**:
- `src/shared/i18n/pf2e-content/ingest/pack-adapter.ts` (isItemPack helper + adaptBabeleItemEntry)
- `src/shared/i18n/pf2e-content/ingest/index.ts` (collectActionTranslations, collectFeatTranslations, collectItemTranslations, collectConditionTranslations)
- `src/shared/i18n/pf2e-content/index.ts` (extend seedKind for new kinds)
- Existing consumer UI files (action page, feat inline card, item drawer) — verify auto-RU via existing useContentTranslation lookup

**Success Criteria**:
1. After boot: translations table has `kind IN ('action', 'feat', 'item', 'condition')` rows
2. Action page → action names show RU при locale=ru
3. Feat inline card → RU descriptions
4. Item drawer → RU descriptions
5. Condition references in stat block → RU labels (через existing TraitPill or text path)

### Phase 101: Structured spell overlay shape
**Goal**: SpellReferenceDrawer surfaces RU range/duration/heightening fields через typed structured_json.
**Depends on**: Phase 95
**Requirements**: SPELL-STRUCT-01, SPELL-STRUCT-02
**Files**:
- `src/shared/i18n/pf2e-content/lib/types.ts` (add SpellStructuredLoc interface)
- `src/shared/i18n/pf2e-content/ingest/pack-adapter.ts` (extend adaptBabeleSpellEntry to populate structured fields)
- `src/shared/i18n/pf2e-content/ingest/index.ts` (SpellTranslationRow gets structured field)
- `src/shared/i18n/pf2e-content/index.ts` (loader writes structured_json for spell rows)
- `src/shared/api/translations.ts` (TranslationRow.structured type union with SpellStructuredLoc)
- `src/entities/spell/ui/SpellReferenceDrawer.tsx` (consume structured fields)

**Success Criteria**:
1. Spell rows have non-null `structured_json`
2. SpellReferenceDrawer renders RU range/duration/cost/time when overlay exists
3. EN fallback when no overlay
4. tsc + build green


---

## v1.7.3 — Strike Names + UI Shell + Item Surface Audit

### Phase 102: entity_items table + denormalization
**Goal**: New table maps creature entity rows × pack item ids → RU name. Migration + loader extension.
**Depends on**: Phase 91/100
**Requirements**: STRIKE-01
**Files**:
- `src/shared/db/migrations/0043_entity_items.sql` (new)
- `src/shared/i18n/pf2e-content/index.ts` (loader extends to populate entity_items)
- `src/shared/api/translations.ts` (new `getStrikeRuName(creatureName, itemId, locale)` helper)

**Success Criteria**:
1. New table `entity_items` with `(entity_name TEXT, item_id TEXT, name_loc TEXT, locale TEXT)` indexed by (entity_name COLLATE NOCASE, item_id, locale)
2. Loader populates rows from each actor pack's items[] (≈1973 actor entries × ~5 items each ≈10k rows)
3. `getStrikeRuName('Aapoph Granitescale', '<longspear-id>', 'ru')` returns 'Длинное копьё'
4. tsc + build clean

### Phase 103: Strike rendering wires RU names
**Goal**: CreatureStrikeRow surfaces RU strike name + RU damage type when locale=ru.
**Depends on**: Phase 102
**Requirements**: STRIKE-02, STRIKE-03
**Files**:
- `src/entities/creature/ui/CreatureStrikeRow.tsx`
- `src/entities/creature/ui/CreatureStatBlock.tsx` (pass creature.name + item ids down)
- `src/entities/creature/model/use-effective-strikes.ts` (verify strike id is preserved in output)

**Success Criteria**:
1. Granitescale strike shows "Длинное копьё" instead of "Longspear" at locale=ru
2. Damage type "piercing" → TraitPill "Колющий" at locale=ru
3. EN regression-free at locale=en
4. tsc + build clean

### Phase 104: Spell drawer chips polish
**Goal**: Spell traditions / save type / trait pills routed through dict.
**Depends on**: Phase 92, Phase 99
**Requirements**: SPELL-CHIPS-01, SPELL-CHIPS-02, SPELL-CHIPS-03
**Files**:
- `src/entities/spell/ui/SpellReferenceDrawer.tsx`

**Success Criteria**:
1. Spell traditions chips show RU labels (Arcane→Мистическая, Primal→Первобытная, Divine→Божественная, Occult→Оккультная)
2. Save type label RU
3. Spell trait pills routed через TraitPill (replace inline span)
4. tsc + build clean

### Phase 105: Toast + Settings + Sidebar i18n audit
**Goal**: Close all common.json gaps and wire useTranslation в shell-level components.
**Depends on**: nothing
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04
**Files**:
- `src/shared/i18n/locales/en/common.json`
- `src/shared/i18n/locales/ru/common.json`
- `src/pages/settings/ui/SettingsPage.tsx`
- `src/shared/api/sync.ts` (toast messages source)
- `src/widgets/app-shell/ui/AppSidebar.tsx`
- header / splash components

**Success Criteria**:
1. New keys: `toast.sync.success`, `toast.sync.failed`, `toast.import.success`, `toast.import.failed`, `settings.dataSource.title`, `settings.dataSource.description`, `settings.sync`, `settings.importLocal`, `settings.lastSync`, `settings.noData`
2. SettingsPage hardcoded strings replaced
3. Toast strings replaced
4. Sidebar/header/splash audit complete
5. tsc + lint clean

### Phase 106: Modal + dialog i18n
**Goal**: Confirmation prompts, update dialogs, error overlays localized.
**Depends on**: Phase 105
**Requirements**: SHELL-05
**Files**:
- `src/shared/ui/error-boundary.tsx`
- `src/shared/ui/UpdateDialog.tsx` (если существует)
- any modal components в widgets/

**Success Criteria**:
1. Error boundary text localized
2. Update dialog text localized
3. Confirmation prompts localized
4. tsc + lint clean

### Phase 107: Action/Feat/Item/Condition UI audit + fixes
**Goal**: Verify Phase 100 seeded data actually surfaces. Fix gaps.
**Depends on**: Phase 100
**Requirements**: AUDIT-01..05
**Files**:
- `src/pages/actions/ui/ActionsPage.tsx`
- `src/entities/feat/ui/FeatInlineCard.tsx`
- `src/entities/item/ui/ItemReferenceDrawer.tsx`
- conditions reference page/modal (find via grep)

**Success Criteria**:
1. ActionsPage: action names + descriptions RU at locale=ru (e.g. Flurry of Blows → Шквал ударов)
2. FeatInlineCard: feat names + descriptions RU
3. ItemReferenceDrawer: item names + descriptions RU; SafeHtml for HTML descriptions
4. Conditions: condition names RU (43 entries from conditionitems pack)
5. EN regression-free
6. tsc + build clean

### Phase 108: v1.7.3 final UAT + version bump
**Goal**: Final smoke + version files + archive.
**Depends on**: Phase 107
**Requirements**: DEBT-02
**Files**:
- `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
- archive ROADMAP

**Success Criteria**:
1. Manual smoke (deferred to user) — all surfaces RU at locale=ru, EN regression-free
2. Version bumped 1.7.2 → 1.7.3
3. Milestone snapshot archived
4. Final tsc + lint + vite build clean

## v1.7.5 — AP Bestiaries + Item-id RU + Special Abilities Coverage

**Milestone Goal:** Закрыть translation coverage gaps: AP-specific bestiary packs (50+ файлов) подхватываются автоматически; per-instance creature items (weapons + special abilities) хранят RU description через расширение `entity_items` schema; AbilityCard / CreatureAbilityRow / strike rows читают RU description через новый `getCreatureItem` API; bestiary `items[]` spell entries (kind=spell) маппятся на spell rows. После v1.7.5 — все известные creature surfaces рендерятся RU когда vendor pack содержит запись; ready для combined v1.7.x tag.

### Phase 109: Vendor Pack Expansion + License Compliance
**Goal**: 28 AP bestiary packs (incl. battlecry-bestiary) скопированы из upstream `pf2-locale-ru/pf2e/packs/*` в vendor; LICENSES обновлены per-AP copyright lines; existing `isActorPack` glob filter автоматически подхватывает новые packs без code change.
**Depends on**: Phase 100 / Phase 102 (existing `isActorPack` + `entity_items` loader)
**Requirements**: PACK-01, PACK-02, PACK-03, PACK-04
**Files**:
- `vendor/pf2e-locale-ru/pf2e/packs/*-bestiary.json` (28 new files)
- `vendor/pf2e-locale-ru/pf2e/packs/battlecry-bestiary.json`
- `vendor/pf2e-locale-ru/VERSION.txt` (upstream SHA + scope note)
- `LICENSES/pf2-locale-ru-CONTRIBUTORS.md` (version SHA + scope note)
- `LICENSES/OGL-SECTION-15.md` (per-AP copyright lines)

**Success Criteria** (what must be TRUE):
  1. After warm boot: translations table contains creature rows from AP bestiaries (e.g., `"Lucky" Lanks` → "Счастливчик Лэнкс" present in DB query)
  2. `vendor/pf2e-locale-ru/pf2e/packs/` size grows from 19 to 47 packs (reality: upstream offers 28 not-yet-vendored bestiary packs, not 36)
  3. `LICENSES/OGL-SECTION-15.md` lists per-AP copyright entries for each AP whose bestiary is now ingested
  4. Existing 19 base packs still ingest cleanly (no regression in base creature translations)
**Plans**: 2 plans
- [x] 109-01-PLAN.md — Copy 28 bestiary packs to vendor, sync VERSION.txt + CONTRIBUTORS.md (PACK-01..03)
- [x] 109-02-PLAN.md — Append per-AP copyright entries to OGL-SECTION-15.md for license compliance (PACK-04)

### Phase 110: Cold-Boot Performance Validation
**Goal**: Замер baseline + post-PACK seed time. Если регрессия превышает +50%, ввести chunked seed timeslicing между packs (microtask yield) чтобы UI splash оставался responsive. Если в пределах допуска — no code change.
**Depends on**: Phase 109
**Requirements**: PERF-01, PERF-02, PERF-03
**Files**:
- `src/shared/i18n/pf2e-content/index.ts` (conditional: yield between pack iterations via `queueMicrotask` / `requestIdleCallback`)
- (no other code changes if PERF-02 ≤ +50%)

**Success Criteria** (what must be TRUE):
  1. Baseline cold-boot seed time documented (current 19 packs, ms)
  2. Post-PACK cold-boot seed time documented (55 packs, ms)
  3. Regression ≤ +50% — либо без code change, либо после chunked-seed introduction
  4. UI splash screen остаётся responsive в течение всего seed (no >500ms блок main thread)
  5. Warm-boot skip preserved (`localStorage` seed marker не повреждён добавлением packs)
**Plans**: 2 plans
- [x] 110-01-PLAN.md — Add DEV-gated [perf] instrumentation to seed pipeline + create PERF-MEASUREMENT.md template (PERF-01, PERF-02)
- [ ] 110-02-PLAN.md — Conditional: read filled measurement, strip instrumentation; if regression > +50% add microtask yields between packs/INSERT chunks (PERF-02, PERF-03)

### Phase 111: Item-ID Description Schema + API
**Goal**: Расширить `entity_items` table колонкой `description_loc` для хранения RU description per-instance items (special abilities в creature `entries.<creature>.items[]`). Loader Phase 102 populates новую колонку. Новый API `getCreatureItem(creatureName, itemId, locale): { name, description | null } | null` расширяет existing `getEntityItemName`.
**Depends on**: Phase 109 (vendor packs in place — иначе loader нечем populate)
**Requirements**: ITEM-ID-01, ITEM-ID-02, ITEM-ID-03
**Files**:
- `src/shared/db/migrations/0045_entity_items_description.sql` (ALTER TABLE ADD COLUMN description_loc TEXT NULL)
- `src/shared/i18n/pf2e-content/index.ts` (loader extension — populate description_loc for items where description present)
- `src/shared/i18n/pf2e-content/ingest/pack-adapter.ts` (extract item description if present in Babele entry)
- `src/shared/api/translations.ts` (new `getCreatureItem` helper extending `getEntityItemName`)

**Success Criteria** (what must be TRUE):
  1. Migration 0045 runs cleanly on warm boot — existing `entity_items` rows preserved with `description_loc = NULL`
  2. After re-seed: `entity_items` rows для special abilities (например, "Финт негодяя" для Lucky Lanks) имеют non-null `description_loc`
  3. `getCreatureItem("Счастливчик Лэнкс", "<rogue-feint-id>", "ru")` returns `{ name: "Финт негодяя", description: "Когда Лэнкс успешно Финтит..." }`
  4. `getCreatureItem` returns `null` when no entry exists (allowing UI fallback chain)
  5. Existing `getEntityItemName` callers продолжают работать (backward compat)
**Plans**: 1 plan
- [x] 111-01-PLAN.md — Migration 0047 + loader description_loc + getCreatureItem API (ITEM-ID-01..03, DEBT-02)

### Phase 112: Special Ability Surface Wiring
**Goal**: AbilityCard / CreatureAbilityRow / strike row для special abilities consume `getCreatureItem(creatureName, itemId, locale)` для отображения RU name + RU description вместе. Existing fallback chain (actionspf2e dictionary → engine EN) preserved.
**Depends on**: Phase 111 (consumes new API)
**Requirements**: ABIL-01, ABIL-02, ABIL-03, ABIL-04
**Files**:
- `src/entities/creature/ui/AbilityCard.tsx` (consume `getCreatureItem` lookup chain when creature context present)
- `src/entities/creature/ui/CreatureAbilityRow.tsx` (single-query RU name + description, no N+1)
- `src/entities/creature/ui/strike/StrikeRow.tsx` (description text для special strike abilities)
- `src/shared/i18n/use-content-translation.ts` (potential extension for creature-scoped item lookup hook)

**Success Criteria** (what must be TRUE):
  1. Reference repro: Lucky Lanks renders "Финт негодяя" с full RU description ("Когда Лэнкс успешно Финтит, его цель Застигнута врасплох...")
  2. Reference repro: Abendego Brute renders "Brute Strength" с full RU description
  3. Ability rows do NOT trigger N+1 queries (single lookup per ability surface)
  4. EN fallback intact: ability без vendor entry показывает English description (no blank cards)
  5. tsc + lint + vite build green
**Plans:** 1/1 plans complete
- [x] 112-01-PLAN.md — Strike description surface + AbilityCard 3-tier fallback chain + useCreatureItem hook (ABIL-01..04, DEBT-02)
**UI hint**: yes

### Phase 113: AP Spell Coverage Extension
**Goal**: Bestiary pack `entries.<creature>.items[]` элементы с `kind=spell` маппятся на spell rows в translations table. Lookup chain `spells-srd[name]` → bestiary per-creature spells → engine EN. Untranslated detection работает для AP-only spells.
**Depends on**: Phase 109 (vendor packs in place)
**Requirements**: SPELL-AP-01, SPELL-AP-02, SPELL-AP-03
**Files**:
- `src/shared/i18n/pf2e-content/ingest/pack-adapter.ts` (detect kind=spell items в bestiary entries; route as spell translations)
- `src/shared/i18n/pf2e-content/index.ts` (extend collectSpellTranslations to merge bestiary-derived spells)
- `src/entities/spell/ui/SpellReferenceDrawer.tsx` (verify lookup chain works для AP spells)

**Success Criteria** (what must be TRUE):
  1. After re-seed: translations table contains spell rows derived from bestiary `items[]` (kind=spell), in addition to base `spells-srd` entries
  2. Reference repro: AP-specific spell from outlaws-of-alkenstar bestiary creature renders RU в SpellReferenceDrawer when vendor entry exists
  3. Spell name collision policy documented — base `spells-srd[name]` wins over bestiary per-creature override (single source of truth)
  4. Untranslated spell badge (Phase 98) continues to fire для truly untranslated spells (no false negatives)
  5. EN fallback intact for AP spells without vendor entry
**Plans**: 1 plan
- [x] 113-01-PLAN.md — Bestiary spell-shape detector + collision-safe second pass over actor packs (SPELL-AP-01..03, DEBT-02)

### Phase 114: Verification + Untranslated Regression
**Goal**: Manual smoke test 10+ AP creatures (по 1 на каждый major AP pack) renders RU end-to-end. Homebrew creature regression check — 🚫RU badge остаётся для creatures без vendor entry. Migration chain 0044 → 0045 верифицирована на warm boot. Final v1.7.5 acceptance.
**Depends on**: Phase 109, 110, 111, 112, 113 (verifies the entire stack)
**Requirements**: UNTRANS-01, UNTRANS-02, VERIFY-01, VERIFY-02, VERIFY-03
**Files**:
- `.planning/phases/114-verify/SMOKE-LIST.md` (manual checklist of 10+ AP creatures)
- `.planning/phases/114-verify/VERIFICATION.md` (results + screenshots if needed)
- `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (version bump 1.7.4 → 1.7.5 при готовности к combined tag)

**Success Criteria** (what must be TRUE):
  1. Manual smoke list: ≥10 AP creatures renders RU at locale=ru (name + subtitle + items + abilities), 1 per major AP pack
  2. Homebrew creature без vendor entry показывает 🚫RU badge (no fabrication, no heuristics) — UNTRANS-02 regression check passes
  3. Migration chain 0044 → 0045 runs cleanly on warm boot (existing `entity_items` rows preserved, new column NULL для старых rows)
  4. 🚫RU badge count для creatures из NEW packs становится near-zero (PACK expansion automatically reduces badge surface)
  5. Final tsc + lint + vite build clean; no regressions в base bestiaries (Phase 109 SC4 carryover)
**Plans**: TBD
