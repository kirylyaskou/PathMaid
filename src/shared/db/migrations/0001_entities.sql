CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  level INTEGER,
  hp INTEGER,
  ac INTEGER,
  fort INTEGER,
  ref INTEGER,
  will INTEGER,
  perception INTEGER,
  traits TEXT,
  rarity TEXT,
  size TEXT,
  source_pack TEXT,
  raw_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_level ON entities(level);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
