-- Phase 56 staging pool: schema drift fix.
--
-- Migration 0024_encounter_staging.sql originally created encounter_staging_combatants
-- with a `label TEXT` column. That design was replaced by "round" INTEGER and the 0024
-- file itself was rewritten in commit c822a1c6. Databases that applied the old 0024
-- (with `label`) never picked up the change because the table already exists and
-- CREATE TABLE IF NOT EXISTS is a no-op. Result: every insert from the current code
-- path fails with "no such column: round", silently lost as an unhandled promise.
--
-- SQLite accepts `round` as a column identifier only inside CREATE TABLE. In a bare
-- column list of an INSERT it is parsed as the built-in round() function and raises a
-- syntax error. All references to the column are therefore double-quoted below.
--
-- This migration rebuilds the table to converge both legacy and fresh databases on the
-- current schema. Existing rows are preserved by id/content; "round" is set to NULL
-- for all rows (SQLite DDL has no IF-COLUMN-EXISTS conditional; staging feature is
-- pre-release so acceptable).

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
  "round" INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO encounter_staging_combatants_v2
  (id, encounter_id, kind, creature_ref, display_name, hp, max_hp, temp_hp,
   creature_level, weak_elite_tier, "round", sort_order)
SELECT
  id, encounter_id, kind, creature_ref, display_name, hp, max_hp, temp_hp,
  creature_level, weak_elite_tier, NULL, sort_order
FROM encounter_staging_combatants;

DROP TABLE encounter_staging_combatants;

ALTER TABLE encounter_staging_combatants_v2 RENAME TO encounter_staging_combatants;

CREATE INDEX IF NOT EXISTS idx_encounter_staging_encounter
  ON encounter_staging_combatants(encounter_id);
