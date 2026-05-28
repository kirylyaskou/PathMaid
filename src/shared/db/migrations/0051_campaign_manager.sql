CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#8f2f2f',
  cover_asset_id TEXT,
  last_opened_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_nodes (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  parent_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('bucket', 'folder', 'note', 'table', 'npc', 'item', 'location')),
  bucket TEXT NOT NULL CHECK (bucket IN ('notes', 'tables', 'npcs', 'items', 'locations')),
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (kind != 'table' OR bucket = 'tables')
    AND (kind != 'npc' OR bucket = 'npcs')
    AND (kind != 'item' OR bucket = 'items')
    AND (kind != 'location' OR bucket = 'locations')
  ),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, parent_id) REFERENCES campaign_nodes(campaign_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_id
  ON campaign_nodes(campaign_id, id);

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_parent
  ON campaign_nodes(campaign_id, parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_kind
  ON campaign_nodes(campaign_id, kind);

CREATE TABLE IF NOT EXISTS campaign_documents (
  node_id TEXT PRIMARY KEY,
  markdown TEXT NOT NULL DEFAULT '',
  profile_json TEXT NOT NULL DEFAULT '{}',
  cover_asset_id TEXT,
  linked_db_refs_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (node_id) REFERENCES campaign_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaign_tables (
  node_id TEXT PRIMARY KEY,
  columns_json TEXT NOT NULL DEFAULT '[]',
  rows_json TEXT NOT NULL DEFAULT '[]',
  cells_json TEXT NOT NULL DEFAULT '{}',
  column_sizes_json TEXT NOT NULL DEFAULT '{}',
  row_sizes_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (node_id) REFERENCES campaign_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaign_links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('markdown', 'table-cell')),
  label TEXT NOT NULL,
  created_from TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, source_node_id) REFERENCES campaign_nodes(campaign_id, id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, target_node_id) REFERENCES campaign_nodes(campaign_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_links_unique
  ON campaign_links(source_node_id, target_node_id, source_kind, created_from);

CREATE INDEX IF NOT EXISTS idx_campaign_links_target
  ON campaign_links(campaign_id, target_node_id);

CREATE TABLE IF NOT EXISTS campaign_pins (
  campaign_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (campaign_id, node_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, node_id) REFERENCES campaign_nodes(campaign_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaign_assets (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('campaign-cover', 'node-cover')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign
  ON campaign_assets(campaign_id);
