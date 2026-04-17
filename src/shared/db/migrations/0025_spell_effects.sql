CREATE TABLE IF NOT EXISTS spell_effects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rules_json TEXT NOT NULL DEFAULT '[]',
  duration_json TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  spell_id TEXT REFERENCES spells(id)
);

CREATE INDEX IF NOT EXISTS idx_spell_effects_name ON spell_effects(name);
CREATE INDEX IF NOT EXISTS idx_spell_effects_spell ON spell_effects(spell_id);

CREATE TABLE IF NOT EXISTS encounter_combatant_effects (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  effect_id TEXT NOT NULL REFERENCES spell_effects(id),
  applied_at INTEGER NOT NULL,
  remaining_turns INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ece_encounter_combatant
  ON encounter_combatant_effects(encounter_id, combatant_id);
