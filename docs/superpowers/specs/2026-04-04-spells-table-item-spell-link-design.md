# Design: Spells Table Overhaul + Item → Spell Link

**Date:** 2026-04-04
**Branch:** v0.9.7
**Scope:** Phase 40 additions

---

## Overview

Two independent features added to Phase 40:

1. **Spells table overhaul** — replace expandable card layout with a proper table, grouped by rank in collapsible sections, with tabs for regular vs focus spells, and a full filter toolbar.
2. **Item → Spell link** — extract linked spell references during sync, render an inline collapsible spell card inside `ItemReferenceDrawer`.

---

## Feature 1: Spells Table Overhaul

### Data Layer

No new columns added to `spells` table. All required data already exists:
- `save_stat`, `action_cost`, `traditions` (JSON), `traits` (JSON), `damage` (JSON), `rank`, `name`, `description`, `area`, `range_text`, `duration_text`, `source_book`

Focus spells are identified at query time: `traditions IS NULL AND traits LIKE '%"focus"%'`.

`searchSpells()` gains `isFocus?: boolean` parameter:
- When `true`: `AND s.traditions IS NULL AND s.traits LIKE '%"focus"%'`
- When `false` (default): `AND (s.traditions IS NOT NULL OR s.traits NOT LIKE '%"focus"%')`

A `trait?: string` filter is also added to support multi-trait filtering from the new filter panel.

### UI Architecture

```
SpellsPage
├── Tabs: "Spells" | "Focus Spells"
├── SpellFilterPanel (toolbar)
│   ├── SearchInput
│   ├── Tradition buttons (arcane / divine / occult / primal) — hidden on Focus tab
│   ├── Trait multi-select combobox
│   ├── Rank buttons (C, 1–10) — when selected: show only that rank section
│   └── Action cost buttons (◇  ↺  ◆  ◆◆  ◆◆◆)
└── Spell list (scrollable)
    ├── SpellRankSection rank=0 "Cantrips" [open by default]
    │   └── SpellsTable
    ├── SpellRankSection rank=1 [open by default]
    │   └── SpellsTable
    └── SpellRankSection rank=2–10 [closed by default]
        └── SpellsTable
```

### SpellsTable Columns

| Column | Source | Notes |
|--------|--------|-------|
| Name | `name` | flex-1 |
| Actions | `action_cost` | ◆/◆◆/◆◆◆/↺/◇ mono |
| Save | `save_stat` | capitalize |
| Damage | `damage` JSON | first entry: `formula damageType` |
| Traditions | `traditions` JSON | colored badges; hidden on Focus tab |
| Traits | `traits` JSON | gray badges, truncated after 3 |

Clicking a row opens `SpellReferenceDrawer` (right side sheet).

### SpellRankSection

- Header: `▼ Rank N  (N spells)` — click to collapse/expand
- Default state: Rank 0 (Cantrips) and Rank 1 open; Rank 2–10 closed
- When rank filter active: only the selected rank section is visible (others hidden, not just collapsed)
- Implemented with shadcn `Collapsible`
- Section hidden entirely if it contains zero spells after filtering

### Focus Spells Tab

Same structure as Spells tab with differences:
- Traditions column replaced with Source (`source_book`)
- No tradition filter buttons in toolbar
- Data filtered by `isFocus: true`

### New Files

```
src/features/spells-catalog/
  ui/SpellFilterPanel.tsx
  ui/SpellsTable.tsx
  ui/SpellRankSection.tsx
  model/useSpellsCatalogStore.ts
  index.ts

src/entities/spell/ui/SpellReferenceDrawer.tsx
src/entities/spell/index.ts  (updated barrel)

src/pages/spells/ui/SpellsPage.tsx  (full rewrite)
```

### SpellReferenceDrawer

Right-side Sheet (same pattern as `ItemReferenceDrawer`). Shows full spell details:
- Header: name, rank badge, traditions badges
- Stats row: actions, save, damage, range, area, duration
- Traits badges
- Description (stripHtml)
- Source

---

## Feature 2: Item → Spell Link

### Data Layer

New migration `0020_item_spell_link.sql`:

```sql
ALTER TABLE items ADD COLUMN linked_spell_id TEXT;
```

`ItemRow` interface gains `linked_spell_id: string | null`.

### Sync Extraction

In `extractAndInsertItems()` inside `sync.ts`:

```ts
// Foundry: consumable/equipment items with embedded spells have
// system.spell with _stats.compendiumSource pointing to the spell compendium entry
const embeddedSpell = sys.spell as Record<string, unknown> | undefined
const spellStats = embeddedSpell?._stats as Record<string, unknown> | undefined
const linkedSpellId = spellStats?.compendiumSource
  ? parseCompendiumId(spellStats.compendiumSource as string)
  : null
```

Added to INSERT statement as 24th column `linked_spell_id`.

### SpellInlineCard Component

`src/entities/spell/ui/SpellInlineCard.tsx`

- Props: `spellId: string`
- Fetches spell via `getSpellById(spellId)` on mount
- Collapsible via shadcn `Collapsible`
- **Collapsed (default):** single row — `name  ◆◆◆  Rank N  Save  damage formula`
- **Expanded:** + range, duration, area, traditions badges, traits badges, description text

### ItemReferenceDrawer Changes

When `item.linked_spell_id` is not null, renders a "Linked Spell" section after the description:

```
LINKED SPELL
┌──────────────────────────────────────────┐
│ SpellInlineCard spellId={linked_spell_id} │
└──────────────────────────────────────────┘
```

Section label: small uppercase `text-muted-foreground` header "Linked Spell".

---

## Implementation Order

1. Migration `0020_item_spell_link.sql`
2. Update `sync.ts` — add `linked_spell_id` extraction + insert
3. Update `ItemRow` interface in `shared/api/items.ts`
4. Build `SpellInlineCard` entity component
5. Update `ItemReferenceDrawer` — add Linked Spell section
6. Build `spells-catalog` feature (store + SpellsTable + SpellRankSection + SpellFilterPanel)
7. Build `SpellReferenceDrawer` entity component
8. Rewrite `SpellsPage`

---

## Constraints

- No test files (project has no tests)
- No subagents — all execution inline
- FSD architecture: features consume entities, pages consume features
- `shared/api/` is sole Tauri IPC boundary
- No new Rust code required — all data already extracted
