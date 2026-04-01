CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  name,
  type,
  traits,
  rarity,
  content=entities,
  content_rowid=rowid
);
