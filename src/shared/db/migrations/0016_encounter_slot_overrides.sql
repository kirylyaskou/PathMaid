CREATE TABLE IF NOT EXISTS encounter_slot_overrides (
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  slot_delta INTEGER NOT NULL,
  PRIMARY KEY (encounter_id, combatant_id, entry_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_eso_encounter ON encounter_slot_overrides(encounter_id);
CREATE INDEX IF NOT EXISTS idx_eso_combatant ON encounter_slot_overrides(combatant_id);
