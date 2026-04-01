# Requirements: Pathfinder 2e DM Assistant

**Defined:** 2026-03-31
**Core Value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.

## v0.2.2-pre-alpha Requirements (COMPLETE)

<details>
<summary>All 9 requirements satisfied</summary>

### Cleanup
- [x] **CLN-01**: All UI code removed
- [x] **CLN-02**: PWOL removed from engine

### Architecture
- [x] **ARCH-01**: PF2e modules relocated to `/engine`
- [x] **ARCH-02**: Barrel exports configured

### Analysis
- [x] **ANAL-01**: Foundry VTT PF2e repo analyzed
- [x] **ANAL-02**: Missing mechanics documented with priorities

### Engine
- [x] **ENG-01**: Missing conditions/statuses implemented per analysis
- [x] **ENG-02**: Missing actions implemented per analysis
- [x] **ENG-03**: Modifier math reworked

</details>

## v0.3.0-pre-alpha Requirements

Requirements for Frontend Rebuild + Engine Integration milestone.

### Foundation

- [x] **FND-01**: Next.js prototype ported to Vite 6 + React 19 SPA with Tauri 2 dev mode working
- [x] **FND-02**: React Router v7 (library mode, `createHashRouter`) replaces Next.js App Router with all page routes
- [x] **FND-03**: Tailwind v4 `@theme inline` configured with all PF2e OKLCH color tokens from prototype
- [x] **FND-04**: shadcn/ui re-initialized for Vite (`rsc: false`), all 60+ Radix components available
- [x] **FND-05**: `steiger` FSD linter + `eslint-plugin-boundaries` enforce layer import direction

### Architecture

- [ ] **ARCH-03**: Codebase organized by FSD (app/pages/widgets/features/entities/shared layers)
- [ ] **ARCH-04**: Zustand stores designed with correct FSD ownership — entity state (serializable, SQLite-derived) separated from feature runtime state (session, in-memory)
- [ ] **ARCH-05**: `shared/api/` is the sole Tauri IPC boundary — all `invoke()` calls centralized there
- [ ] **ARCH-06**: `@engine` alias wired through `vite-tsconfig-paths`, consumed by entities and features layers

### Data

- [ ] **DATA-01**: SQLite + Drizzle ORM reconnected via `sqlite-proxy` + `@tauri-apps/plugin-sql`
- [ ] **DATA-02**: Foundry VTT data sync pipeline working — ZIP download, content-hash upsert, 28K+ entities
- [ ] **DATA-03**: FTS5 full-text search returning results across all entity types
- [ ] **DATA-04**: Splash-before-router pattern — DB migrations complete before React mounts
- [ ] **DATA-05**: Mock data file (`pf2e-data.ts`) deleted — zero mock data in codebase

### Bestiary

- [ ] **BEST-01**: User can browse 28K+ creatures with FTS5 search, level/type/rarity/source filters
- [ ] **BEST-02**: User can view creature stat block with real Foundry data (HP, AC, saves, IWR, strikes, abilities)
- [x] **BEST-03**: User can add creature from bestiary to active combat encounter

### Combat

- [x] **CMB-01**: User can create combat with initiative order, active-turn highlight, round/turn counter
- [x] **CMB-02**: User can track HP and tempHP per combatant with increment/decrement controls
- [x] **CMB-03**: User can apply/remove conditions on combatants, wired to engine ConditionManager
- [x] **CMB-04**: Conditions auto-decrement (frightened, sickened) at turn end via engine CONDITION_EFFECTS
- [x] **CMB-05**: Condition badges show valued-condition numerics and grant chain indicators

### Encounter

- [ ] **ENC-01**: User can build encounters by adding real creatures with live XP budget bar
- [ ] **ENC-02**: XP calculation uses engine `calculateEncounterRating` — not mock functions
- [ ] **ENC-03**: User can configure party size and level for accurate threat rating
- [ ] **ENC-04**: Encounter shows threat level (trivial/low/moderate/severe/extreme) from engine

### Engine Integration (P2 Differentiators)

- [ ] **INT-01**: User can see live IWR preview when inputting damage — engine `applyIWR` breakdown displayed
- [ ] **INT-02**: Dying/Wounded cascade UI with recovery check dialog using engine `performRecoveryCheck`
- [ ] **INT-03**: User can apply Weak/Elite HP presets on creature add via engine `getHpAdjustment`
- [ ] **INT-04**: Persistent damage tracking with auto flat-check prompt at turn end
- [ ] **INT-05**: MAP attack set displayed in creature stat block via engine `buildAttackModifierSets`
- [ ] **INT-06**: Hazard XP supported in encounter builder via engine `getHazardXp`

## Future Requirements

Deferred to future milestones.

- Campaign management (party roster, session history, notes)
- Custom monster creation with stat derivation
- Degree-of-success action outcome display
- Player view / multi-window mode
- Advanced FTS5 faceted filters

## Out of Scope

| Feature | Reason |
|---------|--------|
| Vue.js | Staying with React — no framework port |
| Custom monster creation | Complex validation, separate milestone |
| Cloud sync | Local SQLite only |
| Player-facing features | DM tool only |
| Real-time multiplayer | Single-user desktop app |
| Mobile version | Desktop-first with Tauri |
| PWOL | Removed permanently |
| Test suite | Breaking changes expected; tests added when frontend stabilizes |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 5 | Complete |
| FND-02 | Phase 5 | Complete |
| FND-03 | Phase 5 | Complete |
| FND-04 | Phase 5 | Complete |
| FND-05 | Phase 5 | Complete |
| ARCH-03 | Phase 6 | Pending |
| ARCH-04 | Phase 6 | Pending |
| ARCH-05 | Phase 6 | Pending |
| ARCH-06 | Phase 6 | Pending |
| DATA-01 | Phase 7 | Pending |
| DATA-02 | Phase 7 | Pending |
| DATA-03 | Phase 7 | Pending |
| DATA-04 | Phase 7 | Pending |
| DATA-05 | Phase 7 | Pending |
| BEST-01 | Phase 9 | Pending |
| BEST-02 | Phase 9 | Pending |
| BEST-03 | Phase 8 | Pending |
| CMB-01 | Phase 8 | Pending |
| CMB-02 | Phase 8 | Pending |
| CMB-03 | Phase 8 | Pending |
| CMB-04 | Phase 8 | Pending |
| CMB-05 | Phase 8 | Pending |
| ENC-01 | Phase 9 | Pending |
| ENC-02 | Phase 9 | Pending |
| ENC-03 | Phase 9 | Pending |
| ENC-04 | Phase 9 | Pending |
| INT-01 | Phase 10 | Pending |
| INT-02 | Phase 10 | Pending |
| INT-03 | Phase 10 | Pending |
| INT-04 | Phase 10 | Pending |
| INT-05 | Phase 10 | Pending |
| INT-06 | Phase 10 | Pending |

**Coverage:**
- v0.3.0 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 — traceability complete, all 32 requirements mapped to phases 5-10*
