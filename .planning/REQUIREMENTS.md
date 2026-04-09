# Requirements: PathMaid — v1.1.0 Day-One Patch

**Milestone:** Day-One Patch (PathMaid rebrand + polish + fixes)
**Created:** 2026-04-09
**Core Value:** Feature-complete PF2e DM tool — accurate game logic engine powering a fast, well-organized React frontend with real Foundry VTT entity data.

---

## v1 Requirements

### Rebrand (BRAND)

- [x] **BRAND-01**: App is renamed Pathbuddy → PathMaid across all configs (tauri.conf.json, package.json, DB filename, app identifier) and all UI strings — Phase 47

### Data Quality (SANITIZE)

- [x] **SANITIZE-01**: All unresolved Foundry @-tokens in entity descriptions are removed — no raw tokens visible in any UI surface — Phase 48

### Encounters UX (ENC)

- [x] **ENC-01**: Encounter creation uses explicit "New Encounter" button, not ambiguous "+" — Phase 49
- [x] **ENC-02**: Creature search in encounters supports extended filters: family, traits, source — Phase 49
- [x] **ENC-03**: Creature lists in encounter builder are sorted by level — Phase 49

### Mascot (MASCOT)

- [ ] **MASCOT-01**: Goblin maid GIF animation plays on SplashScreen (replaces D20Die), Foundry sync overlay, and Dashboard EncountersCard empty state — with CSS sway animation — Phase 50

### XP Engine (XP)

- [ ] **XP-01**: XP budget and group level calculator are audited and produce correct values per PF2e CRB rules for all encounter threat levels — Phase 51

### Bug Fixes (BUG)

- [ ] **BUG-01**: 0-initiative bug on encounter load after app restart is fixed — encounters load with correct initiative values — Phase 52
- [ ] **DICE-01**: Dice roll toasts stack vertically in a column and auto-dismiss after timeout — no overlapping toasts — Phase 52

### Code Quality (AUDIT)

- [ ] **AUDIT-01**: Full code audit complete — dead code removed, React performance issues addressed, FSD violations fixed, TypeScript strictness improved — Phase 53

### Platform Builds (CICD)

- [ ] **CICD-01**: Linux and Android CI/CD builds work via GitHub Actions — Phase 54

## Future Requirements

### v1.2 (deferred)

- Mascot in CombatPage empty state (openTabs.length === 0)
- Mascot in InitiativeList empty state (combatants.length === 0)
- Additional mascot variants per page
- Hazard stat block in right panel when hazard selected in combat
- Level range filter in BestiarySearchPanel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom monster creation | Import only, custom editing deferred |
| Cloud sync | Local SQLite only |
| Player-facing features | DM tool only |
| Real-time multiplayer | Single-user desktop app |
| Mobile version | Desktop-first with Tauri |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BRAND-01 | Phase 47 | Complete |
| SANITIZE-01 | Phase 48 | Complete |
| ENC-01 | Phase 49 | Complete |
| ENC-02 | Phase 49 | Complete |
| ENC-03 | Phase 49 | Complete |
| MASCOT-01 | Phase 50 | In Progress |
| XP-01 | Phase 51 | Pending |
| BUG-01 | Phase 52 | Pending |
| DICE-01 | Phase 52 | Pending |
| AUDIT-01 | Phase 53 | Pending |
| CICD-01 | Phase 54 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after v1.1.0 milestone initialization*
