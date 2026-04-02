CREATE TABLE IF NOT EXISTS hazards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  is_complex INTEGER NOT NULL DEFAULT 0,
  hazard_type TEXT NOT NULL DEFAULT 'simple',
  stealth_dc INTEGER,
  stealth_details TEXT,
  ac INTEGER,
  hardness INTEGER,
  hp INTEGER,
  has_health INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  disable_details TEXT,
  reset_details TEXT,
  traits TEXT,
  source_book TEXT,
  source_pack TEXT,
  actions_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_hazards_level ON hazards(level);
CREATE INDEX IF NOT EXISTS idx_hazards_type ON hazards(hazard_type);
