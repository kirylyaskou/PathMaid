-- 61-fix: give spell_effects a source_pack column so category detection
-- can key off the originating Foundry pack (spell-effects /
-- equipment-effects / other-effects) instead of name-pattern guessing.
--
-- Backfill from entities where possible — the original effect rows were
-- synced from entities (type='effect') and still share the same id. Rows
-- that predate the entities-table source_pack population remain NULL and
-- fall back to spell_id / name heuristics in the CASE expression.

ALTER TABLE spell_effects ADD COLUMN source_pack TEXT;

UPDATE spell_effects
SET source_pack = (
  SELECT e.source_pack FROM entities e
  WHERE e.id = spell_effects.id
)
WHERE source_pack IS NULL;

CREATE INDEX IF NOT EXISTS idx_spell_effects_source_pack
  ON spell_effects(source_pack);
