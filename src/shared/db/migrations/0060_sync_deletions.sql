-- Tombstone table for tracking hard-deletes of synced rows.
--
-- Approach: every synced table has an AFTER DELETE trigger that inserts a row
-- here recording which PK was removed. The sync engine reads these tombstones,
-- pushes the deletion to the server (DELETE or UPDATE deleted_at on the remote
-- row), then clears the tombstone.
--
-- This avoids rewriting ~30 existing DELETE call sites in the API layer —
-- the triggers catch deletes from any code path, including ON DELETE CASCADE
-- (SQLite fires AFTER DELETE for each cascaded child row). Hard local deletes
-- keep working unchanged; they just also produce a tombstone for sync.
--
-- row_key is a JSON array of the PK column values, in SYNC_TABLES.pk order:
--   single PK:  ["abc-123"]
--   composite:  ["camp-1","node-2"]
-- This makes the server-side delete generic: the engine looks up the remote
-- table by name and deletes by the same PK columns.

CREATE TABLE IF NOT EXISTS sync_deletions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name  TEXT NOT NULL,
  row_key     TEXT NOT NULL,
  deleted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  pushed      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_deletions_unpushed
  ON sync_deletions(table_name) WHERE pushed = 0;

-- ---------------------------------------------------------------------------
-- AFTER DELETE triggers — one per synced table. Each serialises OLD.<pk cols>
-- into a JSON array. SQLite has no json_build_array in older versions, so we
-- compose the JSON string manually with quote(); quote() wraps strings in
-- double quotes and escapes embedded quotes, which is exactly JSON string
-- encoding. Numbers are returned bare.
-- ---------------------------------------------------------------------------

CREATE TRIGGER tr_campaigns_del
AFTER DELETE ON campaigns
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaigns', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_campaign_nodes_del
AFTER DELETE ON campaign_nodes
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_nodes', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_campaign_documents_del
AFTER DELETE ON campaign_documents
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_documents', '[' || quote(OLD.node_id) || ']');
END;

CREATE TRIGGER tr_campaign_tables_del
AFTER DELETE ON campaign_tables
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_tables', '[' || quote(OLD.node_id) || ']');
END;

CREATE TRIGGER tr_campaign_links_del
AFTER DELETE ON campaign_links
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_links', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_campaign_pins_del
AFTER DELETE ON campaign_pins
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_pins', '[' || quote(OLD.campaign_id) || ',' || quote(OLD.node_id) || ']');
END;

CREATE TRIGGER tr_campaign_graph_positions_del
AFTER DELETE ON campaign_graph_positions
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_graph_positions', '[' || quote(OLD.campaign_id) || ',' || quote(OLD.node_id) || ']');
END;

CREATE TRIGGER tr_campaign_assets_del
AFTER DELETE ON campaign_assets
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_assets', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_campaign_node_artworks_del
AFTER DELETE ON campaign_node_artworks
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('campaign_node_artworks', '[' || quote(OLD.node_id) || ',' || quote(OLD.asset_id) || ']');
END;

CREATE TRIGGER tr_encounters_del
AFTER DELETE ON encounters
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounters', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_combatants_del
AFTER DELETE ON encounter_combatants
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_combatants', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_conditions_del
AFTER DELETE ON encounter_conditions
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_conditions', '[' || quote(OLD.combatant_id) || ',' || quote(OLD.slug) || ']');
END;

CREATE TRIGGER tr_encounter_staging_combatants_del
AFTER DELETE ON encounter_staging_combatants
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_staging_combatants', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_combatant_effects_del
AFTER DELETE ON encounter_combatant_effects
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_combatant_effects', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_spell_slots_del
AFTER DELETE ON encounter_spell_slots
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_spell_slots', '[' || quote(OLD.encounter_id) || ',' || quote(OLD.combatant_id) || ',' || quote(OLD.entry_id) || ',' || quote(OLD.rank) || ']');
END;

CREATE TRIGGER tr_encounter_combatant_spells_del
AFTER DELETE ON encounter_combatant_spells
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_combatant_spells', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_slot_overrides_del
AFTER DELETE ON encounter_slot_overrides
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_slot_overrides', '[' || quote(OLD.encounter_id) || ',' || quote(OLD.combatant_id) || ',' || quote(OLD.entry_id) || ',' || quote(OLD.rank) || ']');
END;

CREATE TRIGGER tr_encounter_combatant_items_del
AFTER DELETE ON encounter_combatant_items
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_combatant_items', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_prepared_casts_del
AFTER DELETE ON encounter_prepared_casts
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_prepared_casts', '[' || quote(OLD.encounter_id) || ',' || quote(OLD.combatant_id) || ',' || quote(OLD.entry_id) || ',' || quote(OLD.rank) || ',' || quote(OLD.spell_slot_key) || ']');
END;

CREATE TRIGGER tr_encounter_combatant_custom_items_del
AFTER DELETE ON encounter_combatant_custom_items
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_combatant_custom_items', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_loot_settings_del
AFTER DELETE ON encounter_loot_settings
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_loot_settings', '[' || quote(OLD.encounter_id) || ']');
END;

CREATE TRIGGER tr_encounter_loot_entries_del
AFTER DELETE ON encounter_loot_entries
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_loot_entries', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_encounter_loot_state_del
AFTER DELETE ON encounter_loot_state
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('encounter_loot_state', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_characters_del
AFTER DELETE ON characters
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('characters', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_custom_creatures_del
AFTER DELETE ON custom_creatures
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('custom_creatures', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_custom_items_del
AFTER DELETE ON custom_items
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('custom_items', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_party_config_del
AFTER DELETE ON party_config
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('party_config', '[' || quote(OLD.id) || ']');
END;

CREATE TRIGGER tr_hotkeys_del
AFTER DELETE ON hotkeys
BEGIN
  INSERT INTO sync_deletions (table_name, row_key)
  VALUES ('hotkeys', '[' || quote(OLD.id) || ']');
END;
