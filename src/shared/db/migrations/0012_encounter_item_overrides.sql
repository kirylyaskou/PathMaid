CREATE TABLE IF NOT EXISTS encounter_combatant_items (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_foundry_id TEXT,
  item_type TEXT NOT NULL DEFAULT 'equipment',
  quantity INTEGER NOT NULL DEFAULT 1,
  damage_formula TEXT,
  ac_bonus INTEGER,
  is_removed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_eci_encounter_combatant ON encounter_combatant_items(encounter_id, combatant_id);
