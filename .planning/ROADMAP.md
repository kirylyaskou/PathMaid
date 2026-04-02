# Roadmap: Pathfinder 2e DM Assistant — v0.3.0-pre-alpha

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-20)
- ✅ **v1.1 Compendium & Combat Workspace** — Phases 01-08 (shipped 2026-03-24)
- ✅ **v2.0 PF2e Game Logic Engine** — Phases 01-06 (shipped 2026-03-25)
- ✅ **v2.1 Engine-UI Integration** — Phases 07-11 (shipped 2026-03-25)
- ✅ **v0.2.2-pre-alpha — PF2e Engine** — Phases 1-4 (complete)
- ✅ **v0.3.0-pre-alpha — Frontend Rebuild + Engine Integration** — Phases 5-10 (complete)
- 🚧 **v0.4.0-pre-alpha — Stabilization + Polish** — Phases 11-13 (in progress)

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
- [x] **Phase 13: Combat UX Sweep** — Kill button in Dying modal; Detection/Attitude conditions removed from picker; wider condition picker layout; single-input HP controls; persistent damage modal fully functional (completed 2026-04-02)

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
| 14. Stat Block Polish 2 | v0.4.0 | 0/TBD | Complete    | 2026-04-02 |

## Backlog

### Phase 999.1: Stat block card in combat tracker (BACKLOG)

**Goal:** Integrate the bestiary stat block card into the combat tracker — clicking a combatant in the tracker opens the same full stat block (with MAP, IWR, abilities, etc.) that's shown in the bestiary browser
**Requirements:** TBD
**Plans:** 0/2 plans complete

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

---
*Roadmap created: 2026-03-31 — v0.2.2-pre-alpha fresh start*
*Last updated: 2026-04-02 — Phase 13 planned (3 plans, 1 wave)*
