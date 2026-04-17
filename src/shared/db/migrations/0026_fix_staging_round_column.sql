-- Phase 56 staging pool: schema drift fix.
--
-- Migration 0024_encounter_staging.sql originally created encounter_staging_combatants
-- with a `label TEXT` column. Commit c822a1c6 rewrote the file to replace it with
-- `round INTEGER` but CREATE TABLE IF NOT EXISTS is a no-op on existing tables, so
-- databases that applied the old 0024 kept the `label` column and saves broke silently.
--
-- Two earlier attempts at this migration both failed with `near "round": syntax error`
-- because this version of SQLite parses `round` inconsistently as an identifier in
-- certain positions (collision with the built-in round() function) and the standard
-- "round" quoting falls back to a string literal due to a long-standing SQLite quirk
-- (https://www.sqlite.org/quirks.html#dblquote).
--
-- To avoid both issues permanently, the column is renamed to `enter_round`. The TS
-- domain type still exposes the field as `round`; the mapping lives in
-- src/shared/api/encounters.ts (saveEncounterStagingCombatants / loadEncounterStagingCombatants).
--
-- Existing rows are preserved by id/content; enter_round becomes NULL for all rows
-- (SQLite DDL has no IF-COLUMN-EXISTS conditional and the feature is pre-release).

DROP TABLE IF EXISTS encounter_staging_combatants_v2;

CREATE TABLE encounter_staging_combatants_v2 (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'npc',
  creature_ref TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL,
  hp INTEGER NOT NULL DEFAULT 0,
  max_hp INTEGER NOT NULL DEFAULT 0,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  creature_level INTEGER NOT NULL DEFAULT 0,
  weak_elite_tier TEXT NOT NULL DEFAULT 'normal',
  enter_round INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO encounter_staging_combatants_v2
  (id, encounter_id, kind, creature_ref, display_name, hp, max_hp, temp_hp,
   creature_level, weak_elite_tier, enter_round, sort_order)
SELECT
  id, encounter_id, kind, creature_ref, display_name, hp, max_hp, temp_hp,
  creature_level, weak_elite_tier, NULL, sort_order
FROM encounter_staging_combatants;

DROP TABLE encounter_staging_combatants;

ALTER TABLE encounter_staging_combatants_v2 RENAME TO encounter_staging_combatants;

CREATE INDEX IF NOT EXISTS idx_encounter_staging_encounter
  ON encounter_staging_combatants(encounter_id);
