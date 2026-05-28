CREATE TABLE IF NOT EXISTS campaign_node_artworks (
  node_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (node_id, asset_id),
  FOREIGN KEY (node_id) REFERENCES campaign_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES campaign_assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_node_artworks_node
  ON campaign_node_artworks(node_id, sort_order);
