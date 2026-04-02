CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'action',
  action_cost INTEGER,
  category TEXT,
  action_category TEXT NOT NULL DEFAULT 'basic',
  description TEXT,
  traits TEXT,
  source_book TEXT
);

CREATE INDEX IF NOT EXISTS idx_actions_category ON actions(action_category);
CREATE INDEX IF NOT EXISTS idx_actions_name ON actions(name);
