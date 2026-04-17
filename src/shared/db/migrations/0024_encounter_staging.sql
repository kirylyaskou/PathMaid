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
  round INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_encounter_staging_encounter
  ON encounter_staging_combatants(encounter_id);
