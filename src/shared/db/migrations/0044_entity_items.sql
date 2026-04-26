-- Denormalized item-level translations attached to actor entries.
--
-- Why a separate table: pack actor entries carry an items[] array with
-- per-weapon / per-feat localized names; the engine emits items by
-- Foundry document id but the translations.structured_json column lives
-- on the row keyed by (kind, name_key, level, locale) where name_key is
-- the actor name. Looking up "translation for this strike" therefore
-- needs a second lookup keyed by (entity_name, item_id), and doing it
-- inline at render time would parse structured_json on every paint.
--
-- This table flattens that lookup so the UI can ask "what is the RU
-- name of weapon item id X belonging to actor Y at locale L" in a
-- single indexed query.

CREATE TABLE IF NOT EXISTS entity_items (
  entity_name TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  locale      TEXT NOT NULL,
  name_loc    TEXT NOT NULL,
  PRIMARY KEY (entity_name, item_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_entity_items_lookup
  ON entity_items (entity_name COLLATE NOCASE, item_id, locale);
