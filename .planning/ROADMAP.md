# Roadmap: Pathfinder 2e DM Assistant — v0.2.2-pre-alpha

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-20)
- ✅ **v1.1 Compendium & Combat Workspace** — Phases 01-08 (shipped 2026-03-24)
- ✅ **v2.0 PF2e Game Logic Engine** — Phases 01-06 (shipped 2026-03-25)
- ✅ **v2.1 Engine-UI Integration** — Phases 07-11 (shipped 2026-03-25)
- 🚧 **v0.2.2-pre-alpha — PF2e Engine** — Phases 1-4 (in progress)

## Phases

<details>
<summary>✅ v1.0–v2.1 (all prior milestones — squashed, SHIPPED)</summary>

All prior milestone phases are archived. Codebase squashed into single initial commit for v0.2.2 fresh start.
Full history preserved in `.planning/milestones/`.

</details>

### 🚧 v0.2.2-pre-alpha — PF2e Engine (In Progress)

**Milestone Goal:** Delete all frontend code, isolate the PF2e engine into `/engine`, analyze the Foundry VTT PF2e source repository to identify gaps, and complete missing engine mechanics. Pure TypeScript work — no UI.

- [ ] **Phase 1: Cleanup + Architecture** — Delete UI code, strip PWOL, move engine to `/engine` with clean barrel exports
- [ ] **Phase 2: Reference Analysis** — Analyze `refs/` Foundry VTT repo; produce gap-analysis document
- [ ] **Phase 3: Conditions & Statuses** — Implement missing conditions and statuses identified in analysis
- [ ] **Phase 4: Actions & Modifier Math** — Implement missing actions and rework modifier value calculation

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

## Progress

**Execution Order:** 1 → 2 → 3 → 4

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Cleanup + Architecture | v0.2.2 | 2/2 | Complete |  |
| 2. Reference Analysis | v0.2.2 | 0/1 | Planned | - |
| 3. Conditions & Statuses | v0.2.2 | 0/TBD | Not started | - |
| 4. Actions & Modifier Math | v0.2.2 | 3/4 | In Progress | - |

---
*Roadmap created: 2026-03-31 — v0.2.2-pre-alpha fresh start*
*Last updated: 2026-03-31*
