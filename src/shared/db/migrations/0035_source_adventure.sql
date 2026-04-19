-- Phase 70 / D-70-02 — Paizo library provenance.
-- Adds `source_adventure` to `entities` so we can distinguish Paizo-shipped
-- library NPCs (iconics, beginner-box pregens, sundered-waves pregens, ...)
-- from generic bestiary content. The column is NULL for anything synced before
-- Phase 70 and for iconics (character-level, not tied to an adventure); it is
-- populated only for pregens where the pack path carries an adventure segment.
--
-- Surfaces that consume this column:
--   - CreatureSearchSidebar source filter (Phase 70 / D-70-04)
--   - Characters page filter + source badge (Phase 70 / D-70-06)

ALTER TABLE entities ADD COLUMN source_adventure TEXT;

CREATE INDEX IF NOT EXISTS idx_entities_source_adventure
  ON entities(source_adventure);
