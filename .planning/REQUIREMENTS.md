# Requirements: Pathfinder 2e DM Assistant

**Defined:** 2026-03-31
**Core Value:** Accurate, complete PF2e game logic engine as standalone TypeScript module.

## v0.2.2-pre-alpha Requirements

Requirements for PF2e Engine milestone. Each maps to roadmap phases.

### Cleanup

- [x] **CLN-01**: All UI code removed (Vue components, views, stores, composables, router, styles, Tauri frontend config)
- [x] **CLN-02**: PWOL (Proficiency Without Level) removed from engine

### Architecture

- [x] **ARCH-01**: PF2e modules relocated to `/engine` with clean directory structure
- [x] **ARCH-02**: Barrel exports configured, engine imports nothing from UI/Tauri/Pinia/Vue

### Analysis

- [x] **ANAL-01**: Foundry VTT PF2e repo (`ref/`) analyzed — gap-analysis document describes what exists vs what's needed
- [x] **ANAL-02**: List of missing mechanics (conditions, actions, statuses) documented with priorities

### Engine

- [ ] **ENG-01**: Missing conditions/statuses implemented per analysis results
- [ ] **ENG-02**: Missing actions implemented per analysis results
- [ ] **ENG-03**: Modifier math reworked — correct calculation of final values with bonuses, penalties, and stacking

## Future Requirements

Deferred to future milestones.

### Frontend

- **UI-01**: React→Vue3 port of v0 prototype
- **UI-02**: FSD (Feature-Sliced Design) architecture for frontend layers
- **UI-03**: Combat tracker UI rebuilt on new engine
- **UI-04**: Compendium browser UI rebuilt
- **UI-05**: Encounter builder UI rebuilt

### Data

- **DATA-01**: Foundry VTT data sync pipeline reconnected to new architecture
- **DATA-02**: SQLite persistence layer for engine state

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Any UI/frontend work | Engine-only milestone; frontend rebuilt in separate milestone |
| PWOL (Proficiency Without Level) | Removed permanently, simplifies engine |
| Test suite | Breaking changes expected; tests added when engine stabilizes |
| Foundry VTT data sync | Data layer deferred until frontend rebuild |
| Campaign management | Frontend feature, not engine |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLN-01 | Phase 1 | Complete |
| CLN-02 | Phase 1 | Complete |
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ANAL-01 | Phase 2 | Complete |
| ANAL-02 | Phase 2 | Complete |
| ENG-01 | Phase 3 | Pending |
| ENG-02 | Phase 4 | Pending |
| ENG-03 | Phase 4 | Pending |

**Coverage:**
- v0.2.2 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 — traceability populated after roadmap creation*
