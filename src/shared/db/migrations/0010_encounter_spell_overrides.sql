CREATE TABLE IF NOT EXISTS encounter_spell_slots (
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (encounter_id, combatant_id, entry_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_ess_encounter ON encounter_spell_slots(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ess_combatant ON encounter_spell_slots(combatant_id);

-- Non-destructive per-encounter spell overrides
-- is_removed=1 means the spell was removed from the default list for this encounter
-- is_removed=0 means the spell was added (not in base creature)
CREATE TABLE IF NOT EXISTS encounter_combatant_spells (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  spell_name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  is_removed INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ecs_encounter ON encounter_combatant_spells(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ecs_combatant ON encounter_combatant_spells(combatant_id);
