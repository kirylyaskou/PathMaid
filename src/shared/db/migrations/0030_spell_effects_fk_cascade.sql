-- Phase 59 / live-fix: make spell_effects FKs cascade-safe.
--
-- Previous failed run left orphan encounter_combatant_effects_new or
-- spell_effects_new tables behind (CREATE succeeded, later DROP failed).
-- The DROP IF EXISTS block at the top is idempotent — harmless on a fresh DB,
-- cleans up stuck state on retry.
--
-- Rebuild both tables (SQLite cannot ALTER a column's FK policy). Order
-- matters: child (encounter_combatant_effects) must be dropped BEFORE parent
-- (spell_effects), otherwise the child's FK to spell_effects blocks the parent
-- drop under PRAGMA foreign_keys=ON (enabled at init in shared/api/db.ts).
--
-- Final FK policy:
--   spell_effects.spell_id           -> spells(id)         ON DELETE SET NULL
--   encounter_combatant_effects.effect_id -> spell_effects(id)  ON DELETE CASCADE
--
-- All existing rows are preserved byte-for-byte; only FK behavior changes.

DROP TABLE IF EXISTS encounter_combatant_effects_new;
DROP TABLE IF EXISTS spell_effects_new;

CREATE TABLE encounter_combatant_effects_new (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  effect_id TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  remaining_turns INTEGER NOT NULL
);

INSERT INTO encounter_combatant_effects_new
  (id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns)
  SELECT id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns
  FROM encounter_combatant_effects;

DROP TABLE encounter_combatant_effects;

CREATE TABLE spell_effects_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rules_json TEXT NOT NULL DEFAULT '[]',
  duration_json TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  spell_id TEXT REFERENCES spells(id) ON DELETE SET NULL
);

INSERT INTO spell_effects_new (id, name, rules_json, duration_json, description, spell_id)
  SELECT id, name, rules_json, duration_json, description, spell_id FROM spell_effects;

DROP TABLE spell_effects;

ALTER TABLE spell_effects_new RENAME TO spell_effects;

CREATE INDEX IF NOT EXISTS idx_spell_effects_name ON spell_effects(name);
CREATE INDEX IF NOT EXISTS idx_spell_effects_spell ON spell_effects(spell_id);

DROP TABLE IF EXISTS encounter_combatant_effects_final;
CREATE TABLE encounter_combatant_effects_final (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  effect_id TEXT NOT NULL REFERENCES spell_effects(id) ON DELETE CASCADE,
  applied_at INTEGER NOT NULL,
  remaining_turns INTEGER NOT NULL
);

INSERT INTO encounter_combatant_effects_final
  (id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns)
  SELECT id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns
  FROM encounter_combatant_effects_new;

DROP TABLE encounter_combatant_effects_new;

ALTER TABLE encounter_combatant_effects_final RENAME TO encounter_combatant_effects;

CREATE INDEX IF NOT EXISTS idx_ece_encounter_combatant
  ON encounter_combatant_effects(encounter_id, combatant_id);
