CREATE TABLE IF NOT EXISTS spells (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  traditions TEXT,
  traits TEXT,
  description TEXT,
  damage TEXT,
  area TEXT,
  range_text TEXT,
  duration_text TEXT,
  action_cost TEXT,
  save_stat TEXT,
  source_book TEXT,
  source_pack TEXT
);

CREATE INDEX IF NOT EXISTS idx_spells_rank ON spells(rank);
CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name);

CREATE VIRTUAL TABLE IF NOT EXISTS spells_fts USING fts5(
  id UNINDEXED,
  name,
  traits,
  content=spells,
  content_rowid=rowid
);

CREATE TABLE IF NOT EXISTS creature_spellcasting_entries (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  entry_name TEXT NOT NULL,
  tradition TEXT,
  cast_type TEXT,
  spell_dc INTEGER,
  spell_attack INTEGER,
  slots TEXT
);

CREATE INDEX IF NOT EXISTS idx_cse_creature ON creature_spellcasting_entries(creature_id);

CREATE TABLE IF NOT EXISTS creature_spell_lists (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  spell_foundry_id TEXT,
  spell_name TEXT NOT NULL,
  rank_prepared INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_csl_creature ON creature_spell_lists(creature_id);
CREATE INDEX IF NOT EXISTS idx_csl_entry ON creature_spell_lists(entry_id);
