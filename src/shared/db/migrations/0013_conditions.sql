CREATE TABLE IF NOT EXISTS conditions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  is_valued INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  group_name TEXT,
  overrides TEXT,
  rules_json TEXT,
  modifier_summary TEXT,
  source_book TEXT
);

CREATE INDEX IF NOT EXISTS idx_conditions_slug ON conditions(slug);
CREATE INDEX IF NOT EXISTS idx_conditions_group ON conditions(group_name);
