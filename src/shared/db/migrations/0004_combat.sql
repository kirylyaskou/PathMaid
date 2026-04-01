CREATE TABLE IF NOT EXISTS combats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Combat',
  round INTEGER NOT NULL DEFAULT 0,
  turn INTEGER NOT NULL DEFAULT 0,
  active_combatant_id TEXT,
  is_running INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS combat_combatants (
  id TEXT PRIMARY KEY,
  combat_id TEXT NOT NULL REFERENCES combats(id) ON DELETE CASCADE,
  creature_ref TEXT,
  display_name TEXT NOT NULL,
  initiative REAL NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 0,
  max_hp INTEGER NOT NULL DEFAULT 0,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  is_npc INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_combat_combatants_combat ON combat_combatants(combat_id);

CREATE TABLE IF NOT EXISTS combat_conditions (
  combatant_id TEXT NOT NULL REFERENCES combat_combatants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  value INTEGER,
  is_locked INTEGER NOT NULL DEFAULT 0,
  granted_by TEXT,
  PRIMARY KEY (combatant_id, slug)
);
