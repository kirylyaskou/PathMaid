-- v1.4.1 UAT fix — store the original Foundry character document alongside
-- the derived Pathbuilder build so future parser improvements apply
-- retroactively without requiring the user to re-sync iconic/pregen packs.
--
-- Rows created before this migration keep raw_foundry_json = NULL; they
-- continue to work with the stored (possibly outdated) derived raw_json.
-- The load path (shared/api/characters.ts → rowToRecord) re-derives from
-- raw_foundry_json whenever it is present.
--
-- Next time the user runs a full sync, extractAndInsertIconicPCs will fill
-- this column for every iconic / pregen row automatically.

ALTER TABLE characters ADD COLUMN raw_foundry_json TEXT;
