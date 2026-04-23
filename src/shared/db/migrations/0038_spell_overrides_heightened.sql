-- Per-instance heighten rank for spell overrides added via search dialog.
-- NULL = not heightened (cast at spell base rank, legacy behavior).
-- Non-NULL = spell's base rank; the override row's `rank` column holds the
-- target slot rank, and the engine reads `heightened_from_rank` to compute
-- how many interval steps of heightening apply.
ALTER TABLE encounter_combatant_spells ADD COLUMN heightened_from_rank INTEGER;
