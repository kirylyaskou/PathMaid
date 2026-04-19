-- Phase 70 / D-70-06 — Paizo library provenance for characters table.
-- Parallel to migration 0035 (which added `source_adventure` to `entities`),
-- characters imported from iconics/pregens need the same provenance so the
-- Characters page can filter + badge user-imports vs library entries.
--
-- Values stored:
--   NULL         → user-imported (Pathbuilder export) or pre-Phase 70.
--   __iconics__  → sourced from the `iconics` pack (Amiri, Ezren, ...).
--   <slug>       → sourced from paizo-pregens/<slug>/... (beginner-box, ...).

ALTER TABLE characters ADD COLUMN source_adventure TEXT;

CREATE INDEX IF NOT EXISTS idx_characters_source_adventure
  ON characters(source_adventure);
