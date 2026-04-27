# Database Schema

PathMaid uses SQLite via `tauri-plugin-sql`. The database file is `pathmaid.db` in the Tauri app data directory. Schema evolves through numbered migration files in `src/shared/db/migrations/`.

---

## Tables

### `entities`

Core content table. Stores creatures, NPCs, characters (Foundry actor types).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Foundry UUID or generated UUID |
| `name` | TEXT NOT NULL | Display name |
| `type` | TEXT NOT NULL | `'npc'` \| `'character'` \| `'hazard'` |
| `level` | INTEGER | Creature level |
| `hp` | INTEGER | Max HP |
| `ac` | INTEGER | Armor Class |
| `fort` | INTEGER | Fortitude save modifier |
| `ref` | INTEGER | Reflex save modifier |
| `will` | INTEGER | Will save modifier |
| `perception` | INTEGER | Perception modifier |
| `traits` | TEXT | Comma-separated trait slugs |
| `rarity` | TEXT | `'common'` \| `'uncommon'` \| `'rare'` \| `'unique'` |
| `size` | TEXT | `'tiny'` \| `'small'` \| `'medium'` \| `'large'` \| `'huge'` \| `'gargantuan'` |
| `source_pack` | TEXT | Foundry pack slug (e.g. `'bestiary-1'`) |
| `raw_json` | TEXT NOT NULL | Full Foundry actor JSON |
| `source_name` | TEXT | Human-readable source (e.g. `'Bestiary 1'`) |
| `source_adventure` | TEXT | Adventure slug for AP bestiary entries |

**Indexes:** `type`, `level`, `name`

---

### `entities_name_fts` / `entities_name_loc_fts`

FTS5 virtual tables for full-text search on creature names. `entities_name_fts` searches English names; `entities_name_loc_fts` searches localized names.

---

### `spells`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL | |
| `level` | INTEGER | Spell rank (1–10) |
| `traditions` | TEXT | JSON array: `["arcane","primal"]` |
| `traits` | TEXT | Comma-separated |
| `school` | TEXT | Spell school slug |
| `source_pack` | TEXT | |
| `raw_json` | TEXT NOT NULL | |

---

### `spell_effects`

Active spell effects (buffs/debuffs) that can be applied to combatants.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL | |
| `rules_json` | TEXT | JSON array of PF2e rule elements |
| `duration_json` | TEXT | `{"value": N, "unit": "rounds"}` |
| `description` | TEXT | |
| `spell_id` | TEXT FK→spells | Source spell (nullable) |

---

### `items`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL | |
| `level` | INTEGER | Item level |
| `price` | INTEGER | Price in copper |
| `bulk` | TEXT | `'L'` \| `'1'` \| `'2'` etc. |
| `traits` | TEXT | |
| `category` | TEXT | |
| `source_pack` | TEXT | |
| `raw_json` | TEXT NOT NULL | |

---

### `combats`

Active combat sessions (non-persistent tracker).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT | Default: `'Combat'` |
| `round` | INTEGER | Current round |
| `turn` | INTEGER | Current turn index |
| `active_combatant_id` | TEXT | FK to combat_combatants |
| `is_running` | INTEGER | Boolean (0/1) |
| `created_at` | TEXT | ISO datetime |
| `updated_at` | TEXT | |

---

### `combat_combatants`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `combat_id` | TEXT FK→combats CASCADE | |
| `creature_ref` | TEXT | entities.id (nullable for custom entries) |
| `display_name` | TEXT NOT NULL | |
| `initiative` | REAL | |
| `hp` | INTEGER | Current HP |
| `max_hp` | INTEGER | |
| `temp_hp` | INTEGER | |
| `is_npc` | INTEGER | Boolean |
| `sort_order` | INTEGER | Initiative sort position |

---

### `combat_conditions`

| Column | Type | Notes |
|---|---|---|
| `combatant_id` | TEXT FK→combat_combatants CASCADE | |
| `slug` | TEXT | Condition slug (e.g. `'frightened'`) |
| `value` | INTEGER | Condition value (for valued conditions) |
| `is_locked` | INTEGER | Boolean — locked conditions are not removed by other effects |
| `granted_by` | TEXT | Slug of condition that granted this one |

**PK:** `(combatant_id, slug)`

---

### `encounters`

Persistent encounter sessions.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL | |
| `party_level` | INTEGER | |
| `party_size` | INTEGER | |
| `round` | INTEGER | |
| `turn` | INTEGER | |
| `active_combatant_id` | TEXT | |
| `is_running` | INTEGER | |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

---

### `encounter_combatants`

Like `combat_combatants` but with additional encounter-specific fields.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `encounter_id` | TEXT FK→encounters CASCADE | |
| `creature_ref` | TEXT | |
| `display_name` | TEXT NOT NULL | |
| `initiative` | REAL | |
| `hp` | INTEGER | |
| `max_hp` | INTEGER | |
| `temp_hp` | INTEGER | |
| `is_npc` | INTEGER | |
| `weak_elite_tier` | TEXT | `'normal'` \| `'weak'` \| `'elite'` |
| `creature_level` | INTEGER | Used for XP calculation |
| `sort_order` | INTEGER | |

---

### `encounter_conditions`

Same structure as `combat_conditions` plus:

| Column | Type | Notes |
|---|---|---|
| `formula` | TEXT | Condition formula string (for programmatic conditions) |

---

### `encounter_combatant_effects`

Active spell effects on combatants in a specific encounter.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `encounter_id` | TEXT | |
| `combatant_id` | TEXT | |
| `effect_id` | TEXT FK→spell_effects | |
| `applied_at` | INTEGER | Round number when applied |
| `remaining_turns` | INTEGER | Turns until expiry |

---

### `characters`

PC characters imported from Pathbuilder.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL UNIQUE | |
| `class` | TEXT | |
| `level` | INTEGER | |
| `ancestry` | TEXT | |
| `raw_json` | TEXT NOT NULL | Full Pathbuilder export JSON |
| `notes` | TEXT | User notes, default `''` |
| `created_at` | TEXT | |

---

### `custom_creatures`

Homebrew creatures built in PathMaid.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL | |
| `level` | INTEGER NOT NULL | |
| `rarity` | TEXT NOT NULL | |
| `source_type` | TEXT NOT NULL | `'original'` \| `'modified'` |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |
| `str/dex/con/int/wis/cha` | INTEGER | Ability scores |
| `data_json` | TEXT NOT NULL | Full stat block JSON |

---

### `party_config`

Single-row configuration table (enforced via `CHECK (id = 1)`).

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Always `1` |
| `party_level` | INTEGER | 1–20 |
| `party_size` | INTEGER | Typically 4 |

---

### `sync_metadata`

Key-value store for Foundry sync state.

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT PK | |
| `value` | TEXT NOT NULL | |

---

### `translations`

Localized content for PF2e entities (RU translations from pf2.ru).

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `kind` | TEXT NOT NULL | `'monster'` \| `'spell'` \| `'item'` \| `'feat'` \| `'action'` |
| `name_key` | TEXT NOT NULL | English name matching source table |
| `level` | INTEGER | Disambiguation for same-name creatures at different levels |
| `locale` | TEXT NOT NULL | BCP-47 code, e.g. `'ru'` |
| `name_loc` | TEXT NOT NULL | Translated name |
| `traits_loc` | TEXT | Comma-separated translated trait labels |
| `text_loc` | TEXT NOT NULL | HTML stat block text |
| `structured_json` | TEXT | Parsed stat block JSON (nullable for legacy rows) |
| `source` | TEXT | Provenance tag, e.g. `'pf2.ru'` |

**Unique index:** `(kind, name_key COLLATE NOCASE, COALESCE(level, -1), locale)`

---

### `_migrations`

Internal migration tracking.

| Column | Type | Notes |
|---|---|---|
| `name` | TEXT PK | Migration filename, e.g. `'0001_entities.sql'` |
| `applied_at` | TEXT | ISO datetime |
