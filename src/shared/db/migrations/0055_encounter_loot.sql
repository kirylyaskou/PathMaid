CREATE TABLE IF NOT EXISTS encounter_loot_settings (
  encounter_id TEXT PRIMARY KEY REFERENCES encounters(id) ON DELETE CASCADE,
  auto_from_enemies INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encounter_loot_entries (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  item_id TEXT NULL REFERENCES items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  item_type TEXT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_gp REAL NULL,
  bulk TEXT NULL,
  notes TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_encounter_loot_entries_encounter
  ON encounter_loot_entries(encounter_id, sort_order);

CREATE TABLE IF NOT EXISTS encounter_loot_state (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  combatant_id TEXT NULL,
  source_item_key TEXT NOT NULL,
  source_item_kind TEXT NOT NULL DEFAULT 'base',
  spent_quantity INTEGER NOT NULL DEFAULT 0,
  excluded INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_encounter_loot_state_encounter
  ON encounter_loot_state(encounter_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_encounter_loot_state_unique
  ON encounter_loot_state(encounter_id, COALESCE(combatant_id, ''), source_item_kind, source_item_key);
