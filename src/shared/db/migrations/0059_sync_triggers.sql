-- Auto-dirty triggers for synced tables.
--
-- Every INSERT or UPDATE on a synced table stamps updated_at = now and
-- sync_dirty = 1 automatically, so write functions across the app need no
-- per-call markDirty wiring — the trigger catches writes from any code path
-- (features, engine, migrations, even raw SQL in the debug console).
--
-- What this does NOT cover: DELETE. A hard DELETE removes the row, so there
-- is nothing to tombstone. Code paths that delete synced rows must call the
-- markDeleted() helper instead, which sets deleted_at + sync_dirty and leaves
-- the tombstone for the next push. Those call sites are few and are wired
-- explicitly in the API layer.
--
-- UPDATE triggers fire when sync_dirty is unchanged (normal app writes).
-- Explicit sync-engine transitions such as sync_dirty = 1 -> 0 are allowed
-- through without immediately re-dirtying the row.
--
-- Note: SQLite has no CREATE TRIGGER IF NOT EXISTS prior to 3.33 in some
-- builds, but the _migrations guard ensures this runs once, so a bare
-- CREATE TRIGGER is safe. Trigger names are globally unique in SQLite.

-- Helper: the trigger body is identical for every table, differing only by
-- table name. We emit one trigger per (table, event) pair. Two events:
--   tr_<table>_dirty_ins  — AFTER INSERT
--   tr_<table>_dirty_upd  — AFTER UPDATE (only when not already being cleared)

CREATE TRIGGER tr_campaigns_dirty_ins
AFTER INSERT ON campaigns
BEGIN
  UPDATE campaigns SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaigns_dirty_upd
AFTER UPDATE ON campaigns
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaigns SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_campaign_nodes_dirty_ins
AFTER INSERT ON campaign_nodes
BEGIN
  UPDATE campaign_nodes SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_nodes_dirty_upd
AFTER UPDATE ON campaign_nodes
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_nodes SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_campaign_documents_dirty_ins
AFTER INSERT ON campaign_documents
BEGIN
  UPDATE campaign_documents SET updated_at = datetime('now'), sync_dirty = 1
  WHERE node_id = NEW.node_id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_documents_dirty_upd
AFTER UPDATE ON campaign_documents
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_documents SET updated_at = datetime('now'), sync_dirty = 1 WHERE node_id = NEW.node_id;
END;

CREATE TRIGGER tr_campaign_tables_dirty_ins
AFTER INSERT ON campaign_tables
BEGIN
  UPDATE campaign_tables SET updated_at = datetime('now'), sync_dirty = 1
  WHERE node_id = NEW.node_id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_tables_dirty_upd
AFTER UPDATE ON campaign_tables
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_tables SET updated_at = datetime('now'), sync_dirty = 1 WHERE node_id = NEW.node_id;
END;

CREATE TRIGGER tr_campaign_links_dirty_ins
AFTER INSERT ON campaign_links
BEGIN
  UPDATE campaign_links SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_links_dirty_upd
AFTER UPDATE ON campaign_links
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_links SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_campaign_pins_dirty_ins
AFTER INSERT ON campaign_pins
BEGIN
  UPDATE campaign_pins SET updated_at = datetime('now'), sync_dirty = 1
  WHERE campaign_id = NEW.campaign_id AND node_id = NEW.node_id
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_pins_dirty_upd
AFTER UPDATE ON campaign_pins
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_pins SET updated_at = datetime('now'), sync_dirty = 1
  WHERE campaign_id = NEW.campaign_id AND node_id = NEW.node_id;
END;

CREATE TRIGGER tr_campaign_graph_positions_dirty_ins
AFTER INSERT ON campaign_graph_positions
BEGIN
  UPDATE campaign_graph_positions SET updated_at = datetime('now'), sync_dirty = 1
  WHERE campaign_id = NEW.campaign_id AND node_id = NEW.node_id
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_graph_positions_dirty_upd
AFTER UPDATE ON campaign_graph_positions
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_graph_positions SET updated_at = datetime('now'), sync_dirty = 1
  WHERE campaign_id = NEW.campaign_id AND node_id = NEW.node_id;
END;

CREATE TRIGGER tr_campaign_assets_dirty_ins
AFTER INSERT ON campaign_assets
BEGIN
  UPDATE campaign_assets SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_assets_dirty_upd
AFTER UPDATE ON campaign_assets
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_assets SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_campaign_node_artworks_dirty_ins
AFTER INSERT ON campaign_node_artworks
BEGIN
  UPDATE campaign_node_artworks SET updated_at = datetime('now'), sync_dirty = 1
  WHERE node_id = NEW.node_id AND asset_id = NEW.asset_id
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_campaign_node_artworks_dirty_upd
AFTER UPDATE ON campaign_node_artworks
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE campaign_node_artworks SET updated_at = datetime('now'), sync_dirty = 1
  WHERE node_id = NEW.node_id AND asset_id = NEW.asset_id;
END;

CREATE TRIGGER tr_encounters_dirty_ins
AFTER INSERT ON encounters
BEGIN
  UPDATE encounters SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounters_dirty_upd
AFTER UPDATE ON encounters
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounters SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_combatants_dirty_ins
AFTER INSERT ON encounter_combatants
BEGIN
  UPDATE encounter_combatants SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_combatants_dirty_upd
AFTER UPDATE ON encounter_combatants
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_combatants SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_conditions_dirty_ins
AFTER INSERT ON encounter_conditions
BEGIN
  UPDATE encounter_conditions SET updated_at = datetime('now'), sync_dirty = 1
  WHERE combatant_id = NEW.combatant_id AND slug = NEW.slug
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_conditions_dirty_upd
AFTER UPDATE ON encounter_conditions
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_conditions SET updated_at = datetime('now'), sync_dirty = 1
  WHERE combatant_id = NEW.combatant_id AND slug = NEW.slug;
END;

CREATE TRIGGER tr_encounter_staging_combatants_dirty_ins
AFTER INSERT ON encounter_staging_combatants
BEGIN
  UPDATE encounter_staging_combatants SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_staging_combatants_dirty_upd
AFTER UPDATE ON encounter_staging_combatants
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_staging_combatants SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_combatant_effects_dirty_ins
AFTER INSERT ON encounter_combatant_effects
BEGIN
  UPDATE encounter_combatant_effects SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_combatant_effects_dirty_upd
AFTER UPDATE ON encounter_combatant_effects
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_combatant_effects SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_spell_slots_dirty_ins
AFTER INSERT ON encounter_spell_slots
BEGIN
  UPDATE encounter_spell_slots SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND combatant_id = NEW.combatant_id
    AND entry_id = NEW.entry_id AND rank = NEW.rank
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_spell_slots_dirty_upd
AFTER UPDATE ON encounter_spell_slots
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_spell_slots SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND combatant_id = NEW.combatant_id
    AND entry_id = NEW.entry_id AND rank = NEW.rank;
END;

CREATE TRIGGER tr_encounter_combatant_spells_dirty_ins
AFTER INSERT ON encounter_combatant_spells
BEGIN
  UPDATE encounter_combatant_spells SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_combatant_spells_dirty_upd
AFTER UPDATE ON encounter_combatant_spells
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_combatant_spells SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_slot_overrides_dirty_ins
AFTER INSERT ON encounter_slot_overrides
BEGIN
  UPDATE encounter_slot_overrides SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND combatant_id = NEW.combatant_id
    AND entry_id = NEW.entry_id AND rank = NEW.rank
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_slot_overrides_dirty_upd
AFTER UPDATE ON encounter_slot_overrides
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_slot_overrides SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND combatant_id = NEW.combatant_id
    AND entry_id = NEW.entry_id AND rank = NEW.rank;
END;

CREATE TRIGGER tr_encounter_combatant_items_dirty_ins
AFTER INSERT ON encounter_combatant_items
BEGIN
  UPDATE encounter_combatant_items SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_combatant_items_dirty_upd
AFTER UPDATE ON encounter_combatant_items
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_combatant_items SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_prepared_casts_dirty_ins
AFTER INSERT ON encounter_prepared_casts
BEGIN
  UPDATE encounter_prepared_casts SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND combatant_id = NEW.combatant_id
    AND entry_id = NEW.entry_id AND rank = NEW.rank AND spell_slot_key = NEW.spell_slot_key
    AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_prepared_casts_dirty_upd
AFTER UPDATE ON encounter_prepared_casts
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_prepared_casts SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND combatant_id = NEW.combatant_id
    AND entry_id = NEW.entry_id AND rank = NEW.rank AND spell_slot_key = NEW.spell_slot_key;
END;

CREATE TRIGGER tr_encounter_combatant_custom_items_dirty_ins
AFTER INSERT ON encounter_combatant_custom_items
BEGIN
  UPDATE encounter_combatant_custom_items SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_combatant_custom_items_dirty_upd
AFTER UPDATE ON encounter_combatant_custom_items
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_combatant_custom_items SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_loot_settings_dirty_ins
AFTER INSERT ON encounter_loot_settings
BEGIN
  UPDATE encounter_loot_settings SET updated_at = datetime('now'), sync_dirty = 1
  WHERE encounter_id = NEW.encounter_id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_loot_settings_dirty_upd
AFTER UPDATE ON encounter_loot_settings
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_loot_settings SET updated_at = datetime('now'), sync_dirty = 1 WHERE encounter_id = NEW.encounter_id;
END;

CREATE TRIGGER tr_encounter_loot_entries_dirty_ins
AFTER INSERT ON encounter_loot_entries
BEGIN
  UPDATE encounter_loot_entries SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_loot_entries_dirty_upd
AFTER UPDATE ON encounter_loot_entries
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_loot_entries SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_encounter_loot_state_dirty_ins
AFTER INSERT ON encounter_loot_state
BEGIN
  UPDATE encounter_loot_state SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_encounter_loot_state_dirty_upd
AFTER UPDATE ON encounter_loot_state
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE encounter_loot_state SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_characters_dirty_ins
AFTER INSERT ON characters
BEGIN
  UPDATE characters SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_characters_dirty_upd
AFTER UPDATE ON characters
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE characters SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_custom_creatures_dirty_ins
AFTER INSERT ON custom_creatures
BEGIN
  UPDATE custom_creatures SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_custom_creatures_dirty_upd
AFTER UPDATE ON custom_creatures
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE custom_creatures SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_custom_items_dirty_ins
AFTER INSERT ON custom_items
BEGIN
  UPDATE custom_items SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_custom_items_dirty_upd
AFTER UPDATE ON custom_items
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE custom_items SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_party_config_dirty_ins
AFTER INSERT ON party_config
BEGIN
  UPDATE party_config SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_party_config_dirty_upd
AFTER UPDATE ON party_config
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE party_config SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER tr_hotkeys_dirty_ins
AFTER INSERT ON hotkeys
BEGIN
  UPDATE hotkeys SET updated_at = datetime('now'), sync_dirty = 1
  WHERE id = NEW.id AND (NEW.sync_dirty IS NULL OR NEW.sync_dirty != 0);
END;
CREATE TRIGGER tr_hotkeys_dirty_upd
AFTER UPDATE ON hotkeys
FOR EACH ROW WHEN NEW.sync_dirty IS NULL OR NEW.sync_dirty = OLD.sync_dirty
BEGIN
  UPDATE hotkeys SET updated_at = datetime('now'), sync_dirty = 1 WHERE id = NEW.id;
END;
