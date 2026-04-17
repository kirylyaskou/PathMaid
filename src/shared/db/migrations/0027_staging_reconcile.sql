-- Phase 56 staging pool: reconcile DBs that ended up inconsistent after 0026.
--
-- Root cause: during iteration on 0026 some databases recorded 0026 as applied in
-- _migrations but physically ended up with no encounter_staging_combatants table
-- and an orphaned encounter_staging_combatants_v2. migrate.ts refuses to re-run a
-- migration once its name is in _migrations, so 0026 cannot self-heal.
--
-- This migration force-reconciles to the final enter_round schema.
--
--   A) Fresh DB where 0026 succeeded: table already exists with enter_round.
--      CREATE IF NOT EXISTS is a no-op. DROP IF EXISTS v2 is a no-op. Index is idempotent.
--
--   B) Broken DB (observed): table missing, v2 orphaned.
--      CREATE IF NOT EXISTS creates the final table. DROP IF EXISTS removes v2.
--      Pre-release feature, no user data to rescue from v2.
--
--   C) Any other partial state: the two statements converge on the correct shape.

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
  enter_round INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

DROP TABLE IF EXISTS encounter_staging_combatants_v2;

CREATE INDEX IF NOT EXISTS idx_encounter_staging_encounter
  ON encounter_staging_combatants(encounter_id);
