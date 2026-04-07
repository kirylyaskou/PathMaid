---
phase: 49
name: Encounters UX Overhaul
status: discussed
date: 2026-04-07
requirements: ENC-01, ENC-02, ENC-03
---

# Phase 49 Context: Encounters UX Overhaul

## Scope

Three targeted improvements to the Encounters page:
1. Visible, labeled "New Encounter" button (ENC-01)
2. Extended creature search filters: family, traits, source book, level, rarity (ENC-02)
3. Creature results sorted by level ascending — always (ENC-03)

---

## Decisions

### ENC-01 — "New Encounter" button

**Decision:** Replace the existing `+` icon button in `SavedEncounterList` header with a labeled "New Encounter" button.

- Current: ghost icon-only `<Button variant="ghost" size="icon">` with `<Plus>` icon
- New: text button labelled "+ New Encounter" (or equivalent) in the same header position
- Inline input flow (type name → Enter/Blur) stays unchanged — only the trigger changes
- File: `src/features/encounter-builder/ui/SavedEncounterList.tsx`

---

### ENC-02 — Extended creature search filters

**Filter UI:**
- Collapsible "Filters" toggle below the search input in `CreatureSearchSidebar`, creatures tab only
- Default: collapsed (filters hidden)
- When expanded: shows level min/max, rarity chips, family/type dropdown, traits text input, source book dropdown
- Active filter count badge on the "Filters" button when any filter is active
- File: `src/features/encounter-builder/ui/CreatureSearchSidebar.tsx`

**Filter fields and data sources:**

| Filter | Column | Notes |
|--------|--------|-------|
| Level min/max | `entities.level` | Two number inputs |
| Rarity | `entities.rarity` | Multi-select chips: common/uncommon/rare/unique |
| Family/type | `entities.creature_type` | NEW column — see schema changes below |
| Traits | `entities.traits` | JSON array string — match with `json_each` or LIKE |
| Source book | `entities.source_name` | Distinct values dropdown |

**Schema change required — `creature_type` column:**

- Field in Foundry JSON: `/system/details/type/value` (string, e.g. "Humanoid", "Dragon", "Undead")
- Rust `RawEntity` struct (`src-tauri/src/sync.rs`): add `creature_type: Option<String>`, extract via `system.pointer("/details/type/value")`
- TypeScript `RawEntity` interface (`src/shared/api/sync.ts`): add `creature_type: string | null`
- New SQL migration: `ALTER TABLE entities ADD COLUMN creature_type TEXT` (non-destructive ADD COLUMN)
- `batchInsertEntities` INSERT: add `creature_type` to column list and values array
- `CreatureRow` (`src/shared/api/creatures.ts`): add `creature_type: string | null`
- Index: `CREATE INDEX IF NOT EXISTS idx_entities_creature_type ON entities(creature_type)`
- No re-sync needed for existing data — can be populated via `UPDATE entities SET creature_type = json_extract(raw_json, '$.system.details.type.value')` in migration

**Migration strategy:** Non-destructive ALTER TABLE + UPDATE via json_extract in migration SQL. No forced re-sync required.

**API changes:**
- Add `fetchCreaturesFiltered(filters, limit, offset)` function to `src/shared/api/creatures.ts`
- Filters type: `{ query?: string, levelMin?: number, levelMax?: number, rarity?: string[], creatureType?: string, traits?: string[], sourceName?: string }`
- When query present: use FTS + ORDER BY level ASC, name ASC (not FTS rank — see ENC-03)
- When query absent: use direct WHERE + ORDER BY level ASC, name ASC

---

### ENC-03 — Sort by level ascending

**Decision:** All creature search results sorted by level ascending in both browse (no query) and text search modes.

- Current browse: `ORDER BY name`
- Current search: `ORDER BY rank` (FTS relevance)
- New: both use `ORDER BY level ASC, name ASC` (name as tiebreaker)
- Applies to the creatures tab only; hazards tab unchanged

---

## Technical Inventory

### Files to modify

| File | Change |
|------|--------|
| `src-tauri/src/sync.rs` | Add `creature_type` field to `RawEntity` struct and `extract_entity()` |
| `src/shared/api/sync.ts` | Add `creature_type` to TypeScript `RawEntity` interface |
| `src/shared/db/migrations/0NNN_creature_type.sql` | ALTER TABLE + UPDATE + CREATE INDEX |
| `src/shared/db/migrate.ts` | Import new migration file via import.meta.glob (auto if glob pattern matches) |
| `src/shared/api/creatures.ts` | Add `creature_type` to `CreatureRow`; add `fetchCreaturesFiltered()` |
| `src/features/encounter-builder/ui/CreatureSearchSidebar.tsx` | Add collapsible filter UI + wire to new API |
| `src/features/encounter-builder/ui/SavedEncounterList.tsx` | Replace icon-only `+` with labeled "New Encounter" button |

### Files NOT to modify
- `EncountersPage.tsx` — no changes needed
- `EncounterEditor.tsx` — no changes needed
- Hazard search — ENC-02/ENC-03 scope is creatures only
- Engine — pure frontend/DB change

---

## Constraints

- `import.meta.glob` for migrations — migration file auto-picked up if naming follows existing pattern (`0NNN_name.sql`)
- No Rust recompilation forced by users who haven't re-synced — `creature_type` populated via migration `json_extract`; re-sync fills it properly going forward
- FSD: filter logic stays inside `features/encounter-builder`; API functions in `shared/api/creatures.ts`

---

## Deferred Ideas

None raised.
