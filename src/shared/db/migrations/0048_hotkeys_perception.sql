-- Hotkeys table for keyboard shortcut persistence.
-- id = stable action identifier (e.g. "next-turn"), chord = key combination string.
-- UNIQUE on action prevents duplicate bindings for the same action.
CREATE TABLE IF NOT EXISTS hotkeys (
  id     TEXT PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  chord  TEXT NOT NULL
);

-- Perception modifier stored per combatant for QuickAdd workflow.
-- NULL default: ALTER ADD COLUMN without NOT NULL yields NULL for existing rows,
-- which is the correct semantic (perception unknown for pre-existing combatants).
ALTER TABLE encounter_combatants ADD COLUMN perception INTEGER;
