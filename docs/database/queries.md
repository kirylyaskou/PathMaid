# Example Queries

Common queries for inspecting the PathMaid database. Connect with any SQLite client (e.g. DB Browser for SQLite, `sqlite3` CLI).

Database location:
- **Windows:** `%APPDATA%\com.pathmaid.app\pathmaid.db`
- **macOS:** `~/Library/Application Support/com.pathmaid.app/pathmaid.db`
- **Linux:** `~/.local/share/com.pathmaid.app/pathmaid.db`

---

## Content

```sql
-- Count entities by type
SELECT type, COUNT(*) FROM entities GROUP BY type;

-- All creatures at level 5+
SELECT id, name, level, ac, hp, source_pack
FROM entities
WHERE type = 'npc' AND level >= 5
ORDER BY level, name;

-- Search creatures by name (exact match, case-insensitive)
SELECT id, name, level, source_pack
FROM entities
WHERE type = 'npc' AND name LIKE '%goblin%'
ORDER BY level;

-- Creatures from a specific source pack
SELECT name, level
FROM entities
WHERE source_pack = 'bestiary-1'
ORDER BY level, name;

-- All spells of rank 3+ with a specific tradition
SELECT name, level, traditions
FROM spells
WHERE level >= 3 AND traditions LIKE '%arcane%'
ORDER BY level, name;

-- Items by category
SELECT name, level, bulk, category
FROM items
WHERE category = 'weapon'
ORDER BY level, name;
```

---

## Combat & Encounters

```sql
-- All saved encounters with combatant counts
SELECT e.name, e.party_level, COUNT(c.id) AS combatants
FROM encounters e
LEFT JOIN encounter_combatants c ON c.encounter_id = e.id
GROUP BY e.id
ORDER BY e.created_at DESC;

-- Active conditions in a specific encounter
SELECT ec.display_name, cc.slug, cc.value
FROM encounter_combatants ec
JOIN encounter_conditions cc ON cc.combatant_id = ec.id
WHERE ec.encounter_id = '<encounter-id>'
ORDER BY ec.display_name, cc.slug;

-- Spell effects applied to combatants in an encounter
SELECT ec.display_name, se.name AS effect, ece.remaining_turns
FROM encounter_combatant_effects ece
JOIN encounter_combatants ec ON ec.id = ece.combatant_id
JOIN spell_effects se ON se.id = ece.effect_id
WHERE ece.encounter_id = '<encounter-id>'
ORDER BY ec.display_name;
```

---

## Characters

```sql
-- All imported PC characters
SELECT name, class, level, ancestry, created_at
FROM characters
ORDER BY name;

-- Characters by level range
SELECT name, class, level
FROM characters
WHERE level BETWEEN 5 AND 10
ORDER BY level, name;
```

---

## Custom Creatures

```sql
-- All homebrew creatures
SELECT name, level, rarity, source_type, updated_at
FROM custom_creatures
ORDER BY level, name;
```

---

## Translations

```sql
-- Check translation coverage for monsters
SELECT COUNT(*) AS total FROM entities WHERE type = 'npc';
SELECT COUNT(*) AS translated FROM translations WHERE kind = 'monster' AND locale = 'ru';

-- Find untranslated monsters (by level range)
SELECT e.name, e.level
FROM entities e
LEFT JOIN translations t
  ON t.kind = 'monster'
  AND t.name_key = e.name COLLATE NOCASE
  AND t.locale = 'ru'
WHERE e.type = 'npc'
  AND t.id IS NULL
  AND e.level BETWEEN 1 AND 5
ORDER BY e.level, e.name
LIMIT 50;

-- Show a specific monster translation
SELECT name_loc, traits_loc, source
FROM translations
WHERE kind = 'monster' AND name_key = 'Goblin' AND locale = 'ru';
```

---

## Maintenance

```sql
-- Check applied migrations
SELECT name, applied_at FROM _migrations ORDER BY name;

-- Verify migration count
SELECT COUNT(*) FROM _migrations;

-- Check database file size (pages * page_size)
PRAGMA page_count;
PRAGMA page_size;

-- Run integrity check
PRAGMA integrity_check;

-- WAL mode status
PRAGMA journal_mode;
```

---

## Schema Inspection

```sql
-- List all tables
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;

-- Show columns for a table
PRAGMA table_info(entities);
PRAGMA table_info(translations);

-- Show indexes for a table
PRAGMA index_list(entities);

-- Show foreign keys for a table
PRAGMA foreign_key_list(encounter_combatants);
```
