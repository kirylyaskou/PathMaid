-- Phase 65 / D-65-06 — GrantItem cascade.
-- Adds `granted_by` to encounter_combatant_effects so auto-applied effects
-- (Enlarge grants Clumsy, composite Rage grants sub-effects, etc.) trail the
-- parent through removal without a separate bookkeeping pass.
--
-- FK policy: ON DELETE CASCADE — parent gone ⇒ grantee gone. Matches the
-- effect_id FK (0030_spell_effects_fk_cascade) so a spell_effects row
-- deletion still tears the whole chain down.
--
-- SQLite cannot ALTER ADD CONSTRAINT, so we rebuild the table in place.
-- Data is preserved byte-for-byte; every existing row is inserted with
-- granted_by NULL (top-level — applied directly by the user).

DROP TABLE IF EXISTS encounter_combatant_effects_granted;

CREATE TABLE encounter_combatant_effects_granted (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  effect_id TEXT NOT NULL REFERENCES spell_effects(id) ON DELETE CASCADE,
  applied_at INTEGER NOT NULL,
  remaining_turns INTEGER NOT NULL,
  granted_by TEXT REFERENCES encounter_combatant_effects(id) ON DELETE CASCADE
);

INSERT INTO encounter_combatant_effects_granted
  (id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns, granted_by)
  SELECT id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns, NULL
  FROM encounter_combatant_effects;

DROP TABLE encounter_combatant_effects;

ALTER TABLE encounter_combatant_effects_granted RENAME TO encounter_combatant_effects;

CREATE INDEX IF NOT EXISTS idx_ece_encounter_combatant
  ON encounter_combatant_effects(encounter_id, combatant_id);

CREATE INDEX IF NOT EXISTS idx_ece_granted_by
  ON encounter_combatant_effects(granted_by);
