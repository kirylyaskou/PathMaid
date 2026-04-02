CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  rarity TEXT,
  bulk TEXT,
  price_gp REAL,
  traits TEXT,
  description TEXT,
  source_book TEXT,
  source_pack TEXT,
  -- weapon fields
  damage_formula TEXT,
  damage_type TEXT,
  weapon_category TEXT,
  weapon_group TEXT,
  -- armor fields
  ac_bonus INTEGER,
  dex_cap INTEGER,
  check_penalty INTEGER,
  speed_penalty INTEGER,
  strength_req INTEGER,
  -- consumable fields
  consumable_category TEXT,
  uses_max INTEGER
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_level ON items(level);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  id UNINDEXED,
  name,
  traits,
  content=items,
  content_rowid=rowid
);

CREATE TABLE IF NOT EXISTS creature_items (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  foundry_item_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  bulk TEXT,
  damage_formula TEXT,
  ac_bonus INTEGER,
  traits TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_creature_items_creature ON creature_items(creature_id);
