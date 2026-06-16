-- Cloud sync columns for user-data tables.
--
-- Adds three tracking columns to every table that mirrors a remote row:
--   updated_at  TEXT — last-write-wins watermark (ISO 8601 UTC).
--   deleted_at  TEXT — soft-delete tombstone; NULL = alive.
--   sync_dirty  INTEGER — 1 = local change not yet pushed; cleared after upsert.
--
-- SQLite ADD COLUMN cannot use IF NOT EXISTS, but the _migrations guard in
-- migrate.ts guarantees this file runs exactly once per database, so the
-- statements are safe. Tables that already declare updated_at natively
-- (campaigns, encounters, custom_creatures, ...) only receive deleted_at +
-- sync_dirty; updated_at is left intact to preserve its existing default.

-- ---------------------------------------------------------------------------
-- CAMPAIGNS family (all have updated_at already)
-- ---------------------------------------------------------------------------
ALTER TABLE campaigns ADD COLUMN deleted_at TEXT;
ALTER TABLE campaigns ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campaign_nodes ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_nodes ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campaign_documents ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_documents ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campaign_tables ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_tables ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campaign_links ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_links ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;
-- campaign_links has no updated_at — add one so it can be synced at all.
ALTER TABLE campaign_links ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';

ALTER TABLE campaign_pins ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_pins ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaign_pins ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';

ALTER TABLE campaign_graph_positions ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_graph_positions ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campaign_assets ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_assets ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaign_assets ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';

ALTER TABLE campaign_node_artworks ADD COLUMN deleted_at TEXT;
ALTER TABLE campaign_node_artworks ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaign_node_artworks ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';

-- ---------------------------------------------------------------------------
-- ENCOUNTERS family
-- ---------------------------------------------------------------------------
-- encounters has updated_at.
ALTER TABLE encounters ADD COLUMN deleted_at TEXT;
ALTER TABLE encounters ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- encounter_combatants: no updated_at.
ALTER TABLE encounter_combatants ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_combatants ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_combatants ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- encounter_conditions: composite PK (combatant_id, slug).
ALTER TABLE encounter_conditions ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_conditions ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_conditions ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_staging_combatants ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_staging_combatants ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_staging_combatants ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_combatant_effects ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_combatant_effects ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_combatant_effects ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- Composite PK override tables.
ALTER TABLE encounter_spell_slots ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_spell_slots ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_spell_slots ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_combatant_spells ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_combatant_spells ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_combatant_spells ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_slot_overrides ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_slot_overrides ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_slot_overrides ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_combatant_items ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_combatant_items ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_combatant_items ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_prepared_casts ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_prepared_casts ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_prepared_casts ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_combatant_custom_items ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_combatant_custom_items ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_combatant_custom_items ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- ENCOUNTER LOOT family
-- ---------------------------------------------------------------------------
-- encounter_loot_settings and encounter_loot_state already have updated_at.
ALTER TABLE encounter_loot_settings ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_loot_settings ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- encounter_loot_entries: no updated_at.
ALTER TABLE encounter_loot_entries ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE encounter_loot_entries ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_loot_entries ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE encounter_loot_state ADD COLUMN deleted_at TEXT;
ALTER TABLE encounter_loot_state ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- CHARACTERS / CUSTOM CONTENT / GLOBAL CONFIG
-- ---------------------------------------------------------------------------
-- characters: no updated_at natively.
ALTER TABLE characters ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE characters ADD COLUMN deleted_at TEXT;
ALTER TABLE characters ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- custom_creatures and custom_items already have updated_at.
ALTER TABLE custom_creatures ADD COLUMN deleted_at TEXT;
ALTER TABLE custom_creatures ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE custom_items ADD COLUMN deleted_at TEXT;
ALTER TABLE custom_items ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- party_config: single-row (id=1). No updated_at.
ALTER TABLE party_config ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE party_config ADD COLUMN deleted_at TEXT;
ALTER TABLE party_config ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

-- hotkeys: no updated_at.
ALTER TABLE hotkeys ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE hotkeys ADD COLUMN deleted_at TEXT;
ALTER TABLE hotkeys ADD COLUMN sync_dirty INTEGER NOT NULL DEFAULT 1;

UPDATE campaign_links SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE campaign_pins SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE campaign_assets SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE campaign_node_artworks SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_combatants SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_conditions SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_staging_combatants SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_combatant_effects SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_spell_slots SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_combatant_spells SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_slot_overrides SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_combatant_items SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_prepared_casts SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_combatant_custom_items SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE encounter_loot_entries SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE characters SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE party_config SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
UPDATE hotkeys SET updated_at = datetime('now') WHERE updated_at = '1970-01-01T00:00:00.000Z';
