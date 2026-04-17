-- 0028_custom_creatures_index.sql
-- Phase 59 (Custom Creature Builder): speed up list-page filtering by (level, rarity).
-- Table was created in 0023_custom_creatures.sql; this migration only adds an index.
-- D-13.

CREATE INDEX IF NOT EXISTS idx_custom_creatures_level_rarity
  ON custom_creatures(level, rarity);
