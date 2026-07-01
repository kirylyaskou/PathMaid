ALTER TABLE campaign_documents ADD COLUMN campaign_id TEXT;
ALTER TABLE campaign_tables ADD COLUMN campaign_id TEXT;
ALTER TABLE campaign_node_artworks ADD COLUMN campaign_id TEXT;

UPDATE campaign_documents
SET campaign_id = (
  SELECT campaign_nodes.campaign_id
  FROM campaign_nodes
  WHERE campaign_nodes.id = campaign_documents.node_id
)
WHERE campaign_id IS NULL;

UPDATE campaign_tables
SET campaign_id = (
  SELECT campaign_nodes.campaign_id
  FROM campaign_nodes
  WHERE campaign_nodes.id = campaign_tables.node_id
)
WHERE campaign_id IS NULL;

UPDATE campaign_node_artworks
SET campaign_id = (
  SELECT campaign_nodes.campaign_id
  FROM campaign_nodes
  WHERE campaign_nodes.id = campaign_node_artworks.node_id
)
WHERE campaign_id IS NULL;
