ALTER TABLE entities ADD COLUMN creature_type TEXT;

UPDATE entities SET creature_type = json_extract(raw_json, '$.system.details.type.value') WHERE type = 'npc';

CREATE INDEX IF NOT EXISTS idx_entities_creature_type ON entities(creature_type);
