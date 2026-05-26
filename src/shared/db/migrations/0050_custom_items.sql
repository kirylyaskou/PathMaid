CREATE TABLE IF NOT EXISTS custom_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  rarity TEXT,
  bulk TEXT,
  price_gp REAL,
  traits TEXT,
  description TEXT,
  source_text TEXT,
  usage TEXT,
  damage_formula TEXT,
  damage_type TEXT,
  weapon_category TEXT,
  weapon_group TEXT,
  ac_bonus INTEGER,
  dex_cap INTEGER,
  check_penalty INTEGER,
  speed_penalty INTEGER,
  strength_req INTEGER,
  consumable_category TEXT,
  uses_max INTEGER,
  rules_json TEXT NOT NULL DEFAULT '[]',
  variants_json TEXT NOT NULL DEFAULT '[]',
  base_item_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_items_name
  ON custom_items(name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_custom_items_type_level
  ON custom_items(item_type, level);

CREATE TABLE IF NOT EXISTS encounter_combatant_custom_items (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  custom_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (custom_item_id) REFERENCES custom_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_encounter_custom_items_lookup
  ON encounter_combatant_custom_items(encounter_id, combatant_id);

CREATE INDEX IF NOT EXISTS idx_encounter_custom_items_item
  ON encounter_combatant_custom_items(custom_item_id);
