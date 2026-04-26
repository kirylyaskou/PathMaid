-- Per-instance item description column for special abilities.
--
-- Babele actor entries carry items[] with optional `description` field —
-- present mainly for action/ability items (e.g. "Финт негодяя",
-- "Brute Strength"), absent for plain weapons. The entity_items
-- table covered name_loc only; this migration adds description_loc so
-- per-creature ability surfaces (AbilityCard, StrikeRow) can lookup
-- RU description in a single indexed query alongside the RU name.
--
-- NULL on existing rows: ALTER ADD COLUMN with no DEFAULT yields NULL
-- for every pre-existing row, which matches the semantic ("no
-- description was extracted"). Loader (entity_items INSERT path,
-- extended alongside this migration) re-seeds via INSERT OR REPLACE,
-- populating description_loc for items whose Babele entry carried a
-- description.

ALTER TABLE entity_items ADD COLUMN description_loc TEXT NULL;
