# Roadmap: Pathfinder 2e DM Assistant — v0.3.0-pre-alpha

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-20)
- ✅ **v1.1 Compendium & Combat Workspace** — Phases 01-08 (shipped 2026-03-24)
- ✅ **v2.0 PF2e Game Logic Engine** — Phases 01-06 (shipped 2026-03-25)
- ✅ **v2.1 Engine-UI Integration** — Phases 07-11 (shipped 2026-03-25)
- ✅ **v0.2.2-pre-alpha — PF2e Engine** — Phases 1-4 (complete)
- 🚧 **v0.3.0-pre-alpha — Frontend Rebuild + Engine Integration** — Phases 5-10 (in progress)

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

### 🚧 v0.3.0-pre-alpha — Frontend Rebuild + Engine Integration

**Milestone Goal:** Port the React prototype from Next.js to Vite + React Router for Tauri, reorganize by FSD, add Zustand state management, reconnect SQLite + Foundry VTT data pipeline, and wire the PF2e engine to replace all mock data with live entity data.

- [ ] **Phase 5: Vite Scaffold + Next.js Teardown** — Running Tauri 2 + Vite 6 + React 19 SPA with createHashRouter, Tailwind v4 OKLCH tokens, and all Next.js artifacts purged
- [x] **Phase 6: FSD Structure + Zustand Stores** — Complete FSD directory skeleton with typed entity layers, all Zustand stores designed with correct ownership, and shared/api/ IPC boundary established
- [ ] **Phase 7: SQLite + Foundry VTT Data Pipeline** — SQLite + Drizzle ORM reconnected, Foundry VTT sync pipeline working, FTS5 search returning 28K+ entities, mock data deleted
- [ ] **Phase 8: Combat Tracker + Engine Integration** — Full 3-panel combat workspace with initiative, HP/tempHP, condition badges wired to engine ConditionManager, auto-decrement, and creature-add from bestiary
- [ ] **Phase 9: Bestiary Browser + Encounter Builder** — Bestiary with FTS5 + filters displaying real Foundry stat blocks, and encounter builder with live XP budget wired to engine calculateEncounterRating
- [ ] **Phase 10: P2 Differentiators** — Engine-powered IWR preview, Dying/Wounded cascade UI, Weak/Elite presets, persistent damage flat-checks, MAP display, and hazard XP — all using complete barrel-exported engine functions

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
**Plans**: TBD

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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** 5 → 6 → 7 → 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Cleanup + Architecture | v0.2.2 | 2/2 | Complete | 2026-03-31 |
| 2. Reference Analysis | v0.2.2 | 1/1 | Complete | 2026-03-31 |
| 3. Conditions & Statuses | v0.2.2 | TBD | Complete | 2026-03-31 |
| 4. Actions & Modifier Math | v0.2.2 | 4/4 | Complete | 2026-03-31 |
| 5. Vite Scaffold + Next.js Teardown | v0.3.0 | 3/3 | Complete | 2026-04-01 |
| 6. FSD Structure + Zustand Stores | v0.3.0 | 4/4 | Complete | 2026-04-01 |
| 7. SQLite + Foundry VTT Data Pipeline | v0.3.0 | 0/TBD | Not started | - |
| 8. Combat Tracker + Engine Integration | v0.3.0 | 0/TBD | Not started | - |
| 9. Bestiary Browser + Encounter Builder | v0.3.0 | 0/TBD | Not started | - |
| 10. P2 Differentiators | v0.3.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-31 — v0.2.2-pre-alpha fresh start*
*Last updated: 2026-04-01 — Phase 6 planned (4 plans in 3 waves)*
