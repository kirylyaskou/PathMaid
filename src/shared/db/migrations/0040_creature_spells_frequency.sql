-- Innate spells carry frequency (1/day, 3/day, at-will) separately from rank
-- slots. NULL = legacy/unknown, renders without per-spell pips (fallback on
-- section entries.length as a proxy for consumable-copy count).
--
-- Shape stored (JSON string):
--   { "kind": "at-will" }
--   { "kind": "per", "max": 3, "per": "day" }   -- or "hour" / "round"
ALTER TABLE creature_spell_lists ADD COLUMN frequency_json TEXT;
