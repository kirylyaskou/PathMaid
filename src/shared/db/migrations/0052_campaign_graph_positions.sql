CREATE TABLE IF NOT EXISTS campaign_graph_positions (
  campaign_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (campaign_id, node_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, node_id) REFERENCES campaign_nodes(campaign_id, id) ON DELETE CASCADE
);
