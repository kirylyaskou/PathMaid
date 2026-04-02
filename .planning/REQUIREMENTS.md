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

## v0.3.0-pre-alpha Requirements (COMPLETE)

<details>
<summary>All 32 requirements satisfied</summary>

### Foundation
- [x] **FND-01**: Next.js prototype ported to Vite 6 + React 19 SPA with Tauri 2 dev mode working
- [x] **FND-02**: React Router v7 (library mode, `createHashRouter`) replaces Next.js App Router with all page routes
- [x] **FND-03**: Tailwind v4 `@theme inline` configured with all PF2e OKLCH color tokens from prototype
- [x] **FND-04**: shadcn/ui re-initialized for Vite (`rsc: false`), all 60+ Radix components available
- [x] **FND-05**: `steiger` FSD linter + `eslint-plugin-boundaries` enforce layer import direction

### Architecture
- [x] **ARCH-03**: Codebase organized by FSD (app/pages/widgets/features/entities/shared layers)
- [x] **ARCH-04**: Zustand stores designed with correct FSD ownership — entity state separated from feature runtime state
- [x] **ARCH-05**: `shared/api/` is the sole Tauri IPC boundary — all `invoke()` calls centralized there
- [x] **ARCH-06**: `@engine` alias wired through `vite-tsconfig-paths`, consumed by entities and features layers

### Data
- [x] **DATA-01**: SQLite + Drizzle ORM reconnected via `sqlite-proxy` + `@tauri-apps/plugin-sql`
- [x] **DATA-02**: Foundry VTT data sync pipeline working — ZIP download, content-hash upsert, 28K+ entities
- [x] **DATA-03**: FTS5 full-text search returning results across all entity types
- [x] **DATA-04**: Splash-before-router pattern — DB migrations complete before React mounts
- [x] **DATA-05**: Mock data file (`pf2e-data.ts`) deleted — zero mock data in codebase

### Bestiary
- [x] **BEST-01**: User can browse 28K+ creatures with FTS5 search, level/type/rarity/source filters
- [x] **BEST-02**: User can view creature stat block with real Foundry data (HP, AC, saves, IWR, strikes, abilities)
- [x] **BEST-03**: User can add creature from bestiary to active combat encounter

### Combat
- [x] **CMB-01**: User can create combat with initiative order, active-turn highlight, round/turn counter
- [x] **CMB-02**: User can track HP and tempHP per combatant with increment/decrement controls
- [x] **CMB-03**: User can apply/remove conditions on combatants, wired to engine ConditionManager
- [x] **CMB-04**: Conditions auto-decrement (frightened, sickened) at turn end via engine CONDITION_EFFECTS
- [x] **CMB-05**: Condition badges show valued-condition numerics and grant chain indicators

### Encounter
- [x] **ENC-01**: User can build encounters by adding real creatures with live XP budget bar
- [x] **ENC-02**: XP calculation uses engine `calculateEncounterRating` — not mock functions
- [x] **ENC-03**: User can configure party size and level for accurate threat rating
- [x] **ENC-04**: Encounter shows threat level (trivial/low/moderate/severe/extreme) from engine

### Engine Integration (P2 Differentiators)
- [x] **INT-01**: User can see live IWR preview when inputting damage — engine `applyIWR` breakdown displayed
- [x] **INT-02**: Dying/Wounded cascade UI with recovery check dialog using engine `performRecoveryCheck`
- [x] **INT-03**: User can apply Weak/Elite HP presets on creature add via engine `getHpAdjustment`
- [x] **INT-04**: Persistent damage tracking with auto flat-check prompt at turn end
- [x] **INT-05**: MAP attack set displayed in creature stat block via engine `buildAttackModifierSets`
- [x] **INT-06**: Hazard XP supported in encounter builder via engine `getHazardXp`

</details>

## v0.4.0-pre-alpha Requirements

Requirements for Stabilization + Polish milestone.

### Splash Screen
- [x] **SPLASH-01**: User sees an animated CSS d20 die and rotating D&D/PF2e loading messages on the splash screen instead of a white screen

### Bug Fixes
- [x] **FIX-01**: Encounters page loads without crashing (fix infinite re-render loop in Radix ScrollArea)

### Stat Block
- [x] **STAT-01**: Ability descriptions render @-syntax (@UUID, @Damage, @Check, @Template, @Localize) as human-readable formatted text instead of raw Foundry markup
- [x] **STAT-02**: Stat block shows all 17 PF2e skills with modifiers, calculating unlisted skills from creature level + proficiency rank

### Bestiary
- [x] **BEST-04**: Sources filter displays book names (Player Core, Monster Core, etc.) instead of folder names (pf2e, sf2e)

### Combat UX
- [x] **CMB-06**: Dying modal includes a "Kill" button to immediately kill the creature without rolling recovery
- [x] **CMB-07**: Condition picker excludes Detection conditions (Observed, Hidden, Undetected, Unnoticed) and Attitude conditions (Hostile, Unfriendly, Friendly, Helpful, Indifferent)
- [x] **CMB-08**: Condition picker has improved UX — wider layout, easier to browse and select
- [x] **CMB-09**: HP controls use a single numeric input with 3 action buttons (Damage / Heal / TempHP) instead of 3 separate inputs
- [x] **CMB-10**: Persistent damage modal displays correctly and functions end-to-end (flat-check, damage application, condition removal)

## Future Requirements

Deferred to future milestones.

- Campaign management (party roster, session history, notes)
- Custom monster creation with stat derivation
- Degree-of-success action outcome display
- Player view / multi-window mode
- Advanced FTS5 faceted filters
- Cross-creature IWR preview (toolbar damage type selector showing all combatants' IWR)
- Dice rolling: auto-roll d20 + modifier + MAP, degree of success vs target AC
- Condition-modifier binding: conditions auto-modify displayed statistics (AC, saves, attacks)
- Bestiary level range filter
- XP budget thresholds per threat tier with party size adjustment
- Stealth modal: "Hide" button comparing Stealth vs Perception

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
| Quick Adventure Group templates | Just XP budget, no auto-creature-suggestion |
| Auto-roll damage dice | DM enters damage manually; only attack d20 is auto-rolled |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPLASH-01 | Phase 11 | Complete |
| FIX-01 | Phase 11 | Complete |
| STAT-01 | Phase 12 | Complete |
| STAT-02 | Phase 12 | Complete |
| BEST-04 | Phase 12 | Complete |
| CMB-06 | Phase 13 | Complete |
| CMB-07 | Phase 13 | Complete |
| CMB-08 | Phase 13 | Complete |
| CMB-09 | Phase 13 | Complete |
| CMB-10 | Phase 13 | Complete |

**Coverage:**
- v0.4.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 — v0.4.0 roadmap created, all 10 requirements mapped to Phases 11-13*
