# Requirements: Pathfinder 2e DM Assistant — v1.0.0

**Milestone:** PC Import (Pathbuilder 2e)
**Created:** 2026-04-05
**Core Value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.

---

## v1 Requirements

### Import (PCImp) — Pathbuilder 2e JSON parsing and storage

- [ ] **PCImp-01**: User can import a PC by uploading a Pathbuilder 2e `.json` file via file picker
- [ ] **PCImp-02**: User can import a PC by pasting JSON text into a dialog
- [ ] **PCImp-03**: Imported PC is stored in SQLite `characters` table with raw JSON blob + indexed fields (id, name, class, level, ancestry, created_at)
- [ ] **PCImp-04**: Re-importing a PC with the same name updates the existing record (upsert by name)

### Characters Page (CHAR) — PC catalog and management

- [ ] **CHAR-01**: User can view all imported PCs on `/characters` with name, class, level, ancestry displayed per card
- [ ] **CHAR-02**: User can delete an imported PC from the list (with confirmation)
- [ ] **CHAR-03**: User can add a PC to the active combat encounter directly from the Characters page

### PC Sheet (SHEET) — Full character display

- [ ] **SHEET-01**: User can view core stats — HP (calculated: ancestryhp + (classhp + bonushp + CON mod) × level), AC (from `acTotal`), speed, saves (fortitude/reflex/will), perception, all 6 ability scores, class/ancestry/background/heritage, level
- [ ] **SHEET-02**: User can view all skill proficiency ranks with computed total modifiers (rank × 2 + ability mod + item bonus from `mods`)
- [ ] **SHEET-03**: User can view equipment — worn armor (with rune notation), weapons, inventory items grouped by container
- [ ] **SHEET-04**: User can view spellcasting — per caster entry: tradition, type (prepared/spontaneous), spell list by level, focus cantrips/spells (read-only reference, no slot tracking)
- [ ] **SHEET-05**: User can view feats list and class features/specials
- [ ] **SHEET-06**: User can write and save free-text DM notes per PC (stored in `characters.notes` column)

### Combat Integration (CMB)

- [ ] **CMB-01**: PC added to combat tracker shows with correct calculated max HP, AC, PC badge, and class info — no encounter overrides
- [ ] **CMB-02**: PC is tracked in combat identically to NPC (initiative, HP/tempHP, conditions, turn advancement) — no spell or item customization

## Future Requirements

### v2 (deferred)

- Spell slot tracking per PC per session
- Per-encounter PC item overrides
- PC re-import from live Pathbuilder URL (by build ID)
- Multiple PC sheets (dual-class full display)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Spell slot tracking in combat | DM tool — players track their own slots |
| Per-encounter spell/item overrides for PC | NPC feature only; PC sheet is read-only reference |
| Character creation/editing | Import only — Pathbuilder is the source of truth |
| Pathbuilder API sync by ID | Requires network + auth; file/paste covers all cases |
| Familiar/pet stat blocks | Low priority; rarely relevant in combat |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PCImp-01 | Phase 42 | Pending |
| PCImp-02 | Phase 42 | Pending |
| PCImp-03 | Phase 42 | Pending |
| PCImp-04 | Phase 42 | Pending |
| CHAR-01 | Phase 43 | Pending |
| CHAR-02 | Phase 43 | Pending |
| CHAR-03 | Phase 43 | Pending |
| SHEET-01 | Phase 44 | Pending |
| SHEET-02 | Phase 44 | Pending |
| SHEET-03 | Phase 44 | Pending |
| SHEET-04 | Phase 44 | Pending |
| SHEET-05 | Phase 44 | Pending |
| SHEET-06 | Phase 44 | Pending |
| CMB-01 | Phase 45 | Pending |
| CMB-02 | Phase 45 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after initial definition*
