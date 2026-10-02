CREATE TABLE IF NOT EXISTS custom_hazards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  hazard_type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE hazards ADD COLUMN routine_details TEXT;
ALTER TABLE encounter_combatants ADD COLUMN hazard_disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE encounter_combatants ADD COLUMN hazard_check_progress INTEGER NOT NULL DEFAULT 0;
ALTER TABLE combat_combatants ADD COLUMN is_hazard INTEGER NOT NULL DEFAULT 0;
ALTER TABLE combat_combatants ADD COLUMN hazard_disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE combat_combatants ADD COLUMN hazard_check_progress INTEGER NOT NULL DEFAULT 0;
