CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  party_level INTEGER NOT NULL DEFAULT 1,
  party_size INTEGER NOT NULL DEFAULT 4,
  round INTEGER NOT NULL DEFAULT 0,
  turn INTEGER NOT NULL DEFAULT 0,
  active_combatant_id TEXT,
  is_running INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS encounter_combatants (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  creature_ref TEXT,
  display_name TEXT NOT NULL,
  initiative REAL NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 0,
  max_hp INTEGER NOT NULL DEFAULT 0,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  is_npc INTEGER NOT NULL DEFAULT 1,
  weak_elite_tier TEXT NOT NULL DEFAULT 'normal',
  creature_level INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_encounter_combatants_encounter ON encounter_combatants(encounter_id);

CREATE TABLE IF NOT EXISTS encounter_conditions (
  combatant_id TEXT NOT NULL REFERENCES encounter_combatants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  value INTEGER,
  is_locked INTEGER NOT NULL DEFAULT 0,
  granted_by TEXT,
  formula TEXT,
  PRIMARY KEY (combatant_id, slug)
);
