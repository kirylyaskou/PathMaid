-- Phase 56 staging pool: schema drift fix.
--
-- Migration 0024_encounter_staging.sql originally created encounter_staging_combatants
-- with a `label TEXT` column. Commit c822a1c6 rewrote the file to replace it with
-- `round INTEGER` but CREATE TABLE IF NOT EXISTS is a no-op on existing tables, so
-- databases that applied the old 0024 kept the `label` column and saves broke silently.
--
-- Earlier attempts at this migration failed with
--   near "round": syntax error   (SQLite parses `round` as round() in some contexts,
--                                  and "round" quoting falls back to a string literal
--                                  due to the long-standing SQLite quirk
--                                  https://www.sqlite.org/quirks.html#dblquote)
--   near "the": syntax error     (migrate.ts split on every `;`, including semicolons
--                                  that appeared inside comment prose)
--
-- To avoid both issues permanently, the column is renamed to `enter_round`. The TS
-- domain type still exposes the field as `round` — the mapping lives in
-- src/shared/api/encounters.ts (saveEncounterStagingCombatants, loadEncounterStagingCombatants).
--
-- The migration is idempotent across four possible starting states:
--   A) Fresh DB (never ran 0024)         — tables don't exist
--   B) Legacy DB (old 0024 with label)   — encounter_staging_combatants has `label`
--   C) Fresh-ish DB (new 0024 with round)— encounter_staging_combatants has `round`
--   D) Recovery (failed 0026 attempt)    — encounter_staging_combatants was dropped,
--                                          no _v2 exists (DROP IF EXISTS in prior version)
--
-- Strategy: (1) CREATE IF NOT EXISTS restores the table for state D without disturbing
-- B or C. (2) Rebuild via _v2 finalises enter_round schema. Any existing `label` or
-- `round` values are discarded — acceptable because the feature is pre-release.
--
-- NOTE: migrate.ts now strips `--` comments before splitting on `;`, but keep comments
-- semicolon-free anyway for safety.

CREATE TABLE IF NOT EXISTS encounter_staging_combatants (
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
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

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
