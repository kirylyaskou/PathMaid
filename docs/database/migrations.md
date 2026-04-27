# Migrations

Migrations live in `src/shared/db/migrations/` and are applied in lexicographic (filename) order on every app startup. Each migration runs only once — tracked in the `_migrations` table.

## Migration List

| File | Description |
|---|---|
| `0001_entities.sql` | Core `entities` table + type/level/name indexes |
| `0002_entities_fts.sql` | FTS5 full-text search on entity names |
| `0003_sync_metadata.sql` | `sync_metadata` key-value store for Foundry sync state |
| `0004_combat.sql` | `combats`, `combat_combatants`, `combat_conditions` |
| `0005_party_config.sql` | `party_config` singleton row (party_level, party_size) |
| `0006_condition_formula.sql` | `formula` column on combat_conditions |
| `0007_source_name.sql` | `source_name` column on entities |
| `0008_encounter_persistence.sql` | `encounters`, `encounter_combatants`, `encounter_conditions` |
| `0009_spells.sql` | `spells` table |
| `0010_encounter_spell_overrides.sql` | Heightened spell slot overrides per encounter combatant |
| `0011_items.sql` | `items` table |
| `0012_encounter_item_overrides.sql` | Item slot overrides per encounter combatant |
| `0013_conditions.sql` | Condition reference data table |
| `0014_hazards.sql` | `hazards` table |
| `0015_actions.sql` | `actions` table |
| `0016_encounter_slot_overrides.sql` | General slot override table |
| `0017_item_favorites_usage.sql` | Item favorites and usage tracking columns |
| `0018_purge_starfinder.sql` | Removes Starfinder content accidentally ingested from shared packs |
| `0019_item_spell_link.sql` | Links items to their contained spell (wand/scroll) |
| `0020_encounter_hazard_columns.sql` | Hazard-specific columns on encounter_combatants |
| `0021_characters.sql` | `characters` table (Pathbuilder PC import) |
| `0022_combatant_level.sql` | `creature_level` column on combat_combatants |
| `0023_custom_creatures.sql` | `custom_creatures` table |
| `0024_encounter_staging.sql` | Staging area for encounter combatant edits |
| `0025_spell_effects.sql` | `spell_effects` + `encounter_combatant_effects` |
| `0026_fix_staging_round_column.sql` | Fixes column name typo from 0024 |
| `0027_staging_reconcile.sql` | Staging → live reconciliation support |
| `0028_custom_creatures_index.sql` | Name index on custom_creatures |
| `0029_spells_heightened.sql` | Heightened damage formula columns on spells |
| `0030_spell_effects_fk_cascade.sql` | Adds FK cascade to spell_effects (table rebuild) |
| `0031_encounter_prepared_casts.sql` | Tracks prepared spell slot usage per encounter |
| `0032_strip_effect_name_prefix.sql` | Data cleanup: strips `'Effect: '` prefix from effect names |
| `0033_spell_effects_source_pack.sql` | `source_pack` column on spell_effects |
| `0034_effects_granted_by.sql` | `granted_by` column on encounter_combatant_effects (table rebuild) |
| `0035_source_adventure.sql` | `source_adventure` column on entities (AP bestiary origin) |
| `0036_characters_source.sql` | Source metadata columns on characters |
| `0037_characters_raw_foundry_json.sql` | `raw_foundry_json` column for original Foundry actor data |
| `0038_spell_overrides_heightened.sql` | Heightened rank overrides on spell slot table |
| `0039_encounter_effects_cast_rank.sql` | `cast_rank` column on encounter_combatant_effects |
| `0040_creature_spells_frequency.sql` | Frequency data for innate/focus spell entries |
| `0041_translations.sql` | `translations` table for localized content (RU) |
| `0042_translation_structured_json.sql` | `structured_json` column on translations |
| `0043_entities_name_loc_fts.sql` | FTS5 on localized entity names |
| `0044_entity_items.sql` | `entity_items` table linking entities to their carried items |
| `0045_translations_source_index.sql` | Index on translations(source) |
| `0046_translations_lookup_index.sql` | Composite lookup index on translations |
| `0047_entity_items_description.sql` | `description` column on entity_items |

## How Migrations Work

1. On startup, `runMigrations()` reads all `.sql` files via `import.meta.glob`
2. Sorts them lexicographically by filename
3. Loads the set of already-applied names from `_migrations`
4. For each unapplied migration: strips SQL comments, splits on `;`, executes each statement
5. Inserts the filename into `_migrations` with `INSERT OR IGNORE`

`PRAGMA foreign_keys` is set to `OFF` during migrations and restored to `ON` after. This is required for the table-rebuild migrations (0030, 0034) that use the SQLite `CREATE new → INSERT SELECT → DROP old → RENAME` pattern.

## Adding a Migration

1. Create `src/shared/db/migrations/NNNN_description.sql` where `NNNN` is the next number in sequence
2. Write idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)
3. For column additions use `ALTER TABLE ... ADD COLUMN` (idempotent on SQLite 3.37+) or guard with a migration check
4. The migration runs automatically on next app startup

Never rename or edit a migration that has already been shipped — existing installs have it recorded in `_migrations` and will skip re-application. For fixes, add a new migration.
