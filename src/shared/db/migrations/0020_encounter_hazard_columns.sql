ALTER TABLE encounter_combatants ADD COLUMN is_hazard INTEGER NOT NULL DEFAULT 0;
ALTER TABLE encounter_combatants ADD COLUMN hazard_ref TEXT;
