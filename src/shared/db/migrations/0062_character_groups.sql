CREATE TABLE IF NOT EXISTS character_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  character_ids TEXT NOT NULL DEFAULT '[]'
);
