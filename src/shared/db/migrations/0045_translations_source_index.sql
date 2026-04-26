-- Index on translations.source so DELETE cleanup on cold boot
-- does not full-scan the table (16 000+ rows at v1.7.x).
CREATE INDEX IF NOT EXISTS idx_translations_source
  ON translations(source);
