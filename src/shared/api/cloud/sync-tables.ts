/**
 * Registry of tables that participate in cloud sync.
 *
 * Each entry maps a local SQLite table to its remote Postgres mirror and tells
 * the sync engine everything it needs to push/pull rows generically:
 *   - the column list (for SELECT/upsert projection — must match BOTH schemas
 *     column-for-column; sync_dirty / deleted_at are sync-control columns and
 *     are NOT sent over the wire)
 *   - the primary-key columns (composite PKs supported — e.g. encounter_spell_slots)
 *   - an optional WHERE filter restricting which local rows are in scope
 *     (e.g. characters only sync user PCs, never iconics)
 *
 * Column lists are checked against the live migrations by hand at authoring
 * time — there is no runtime schema diff. The order here is also the order in
 * which tables sync (parents before children) so foreign-key references on the
 * server resolve during a single pass.
 */

export interface SyncTableDef {
  /** Local SQLite table name. */
  local: string
  /** Remote Postgres table name (same in all cases here). */
  remote: string
  /** Primary-key column(s). Composite for override/lookup-style tables. */
  pk: string[]
  /**
   * Data columns carried over the wire (excludes sync-control columns:
   * updated_at, deleted_at, sync_dirty). For tables with a parent FK the
   * parent id (campaign_id / encounter_id) IS included so server-side RLS
   * and orphan-cleanup still work.
   */
  columns: string[]
  /**
   * Optional local-row filter. Only rows matching this are pushed or pulled.
   * Used to exclude reference data that lives in the same table as user data.
   */
  localFilter?: string
  /**
   * Optional remote-row filter applied during pull (server-side WHERE).
   * Mirrors localFilter semantics but evaluated by Postgres.
   */
  remoteFilter?: string
}

/**
 * The sync set. Order matters: a parent must appear before its children so
 * that when pulling a campaign, `campaigns` lands before `campaign_nodes`
 * (which FK to it). Same for encounters → encounter_combatants → child rows.
 */
export const SYNC_TABLES: readonly SyncTableDef[] = [
  // -- Campaigns (parent → children) --------------------------------------
  {
    local: 'campaigns',
    remote: 'campaigns',
    pk: ['id'],
    columns: ['id', 'name', 'description', 'accent_color', 'cover_asset_id', 'last_opened_at', 'created_at'],
  },
  {
    local: 'campaign_nodes',
    remote: 'campaign_nodes',
    pk: ['id'],
    columns: ['id', 'campaign_id', 'parent_id', 'kind', 'bucket', 'title', 'sort_order', 'is_system', 'created_at'],
  },
  {
    local: 'campaign_documents',
    remote: 'campaign_documents',
    pk: ['node_id'],
    columns: ['node_id', 'campaign_id', 'markdown', 'profile_json', 'cover_asset_id', 'linked_db_refs_json'],
  },
  {
    local: 'campaign_tables',
    remote: 'campaign_tables',
    pk: ['node_id'],
    columns: ['node_id', 'campaign_id', 'columns_json', 'rows_json', 'cells_json', 'column_sizes_json', 'row_sizes_json'],
  },
  {
    local: 'campaign_links',
    remote: 'campaign_links',
    pk: ['id'],
    columns: ['id', 'campaign_id', 'source_node_id', 'target_node_id', 'source_kind', 'label', 'created_from', 'created_at'],
  },
  {
    local: 'campaign_pins',
    remote: 'campaign_pins',
    pk: ['campaign_id', 'node_id'],
    columns: ['campaign_id', 'node_id', 'sort_order', 'created_at'],
  },
  {
    local: 'campaign_graph_positions',
    remote: 'campaign_graph_positions',
    pk: ['campaign_id', 'node_id'],
    columns: ['campaign_id', 'node_id', 'x', 'y'],
  },
  {
    local: 'campaign_assets',
    remote: 'campaign_assets',
    pk: ['id'],
    columns: ['id', 'campaign_id', 'kind', 'file_name', 'mime_type', 'relative_path', 'created_at'],
  },
  {
    local: 'campaign_node_artworks',
    remote: 'campaign_node_artworks',
    pk: ['node_id', 'asset_id'],
    columns: ['node_id', 'asset_id', 'campaign_id', 'sort_order', 'created_at'],
  },

  // -- Encounters (parent → children) -------------------------------------
  {
    local: 'encounters',
    remote: 'encounters',
    pk: ['id'],
    columns: ['id', 'campaign_id', 'name', 'party_level', 'party_size', 'round', 'turn', 'active_combatant_id', 'is_running', 'created_at'],
  },
  {
    local: 'encounter_combatants',
    remote: 'encounter_combatants',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'creature_ref', 'display_name', 'initiative', 'hp', 'max_hp', 'temp_hp', 'is_npc', 'weak_elite_tier', 'creature_level', 'sort_order', 'is_hazard', 'hazard_ref', 'side', 'perception', 'created_at'],
  },
  {
    local: 'encounter_conditions',
    remote: 'encounter_conditions',
    pk: ['combatant_id', 'slug'],
    columns: ['combatant_id', 'slug', 'encounter_id', 'value', 'is_locked', 'granted_by', 'formula'],
  },
  {
    local: 'encounter_staging_combatants',
    remote: 'encounter_staging_combatants',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'kind', 'creature_ref', 'display_name', 'hp', 'max_hp', 'temp_hp', 'creature_level', 'weak_elite_tier', 'round', 'sort_order', 'created_at'],
  },
  {
    local: 'encounter_combatant_effects',
    remote: 'encounter_combatant_effects',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'combatant_id', 'effect_id', 'applied_at', 'remaining_turns', 'granted_by', 'created_at'],
  },
  {
    local: 'encounter_spell_slots',
    remote: 'encounter_spell_slots',
    pk: ['encounter_id', 'combatant_id', 'entry_id', 'rank'],
    columns: ['encounter_id', 'combatant_id', 'entry_id', 'rank', 'used_count'],
  },
  {
    local: 'encounter_combatant_spells',
    remote: 'encounter_combatant_spells',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'combatant_id', 'entry_id', 'spell_name', 'rank', 'is_removed', 'sort_order', 'created_at'],
  },
  {
    local: 'encounter_slot_overrides',
    remote: 'encounter_slot_overrides',
    pk: ['encounter_id', 'combatant_id', 'entry_id', 'rank'],
    columns: ['encounter_id', 'combatant_id', 'entry_id', 'rank', 'slot_delta'],
  },
  {
    local: 'encounter_combatant_items',
    remote: 'encounter_combatant_items',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'combatant_id', 'item_name', 'item_foundry_id', 'item_type', 'quantity', 'damage_formula', 'ac_bonus', 'is_removed', 'created_at'],
  },
  {
    local: 'encounter_prepared_casts',
    remote: 'encounter_prepared_casts',
    pk: ['encounter_id', 'combatant_id', 'entry_id', 'rank', 'spell_slot_key'],
    columns: ['encounter_id', 'combatant_id', 'entry_id', 'rank', 'spell_slot_key'],
  },
  {
    local: 'encounter_combatant_custom_items',
    remote: 'encounter_combatant_custom_items',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'combatant_id', 'custom_item_id', 'quantity', 'is_removed', 'created_at'],
  },
  {
    local: 'encounter_loot_settings',
    remote: 'encounter_loot_settings',
    pk: ['encounter_id'],
    columns: ['encounter_id', 'auto_from_enemies'],
  },
  {
    local: 'encounter_loot_entries',
    remote: 'encounter_loot_entries',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'item_id', 'name', 'item_type', 'quantity', 'price_gp', 'bulk', 'notes', 'sort_order', 'created_at'],
  },
  {
    local: 'encounter_loot_state',
    remote: 'encounter_loot_state',
    pk: ['id'],
    columns: ['id', 'encounter_id', 'combatant_id', 'source_item_key', 'source_item_kind', 'spent_quantity', 'excluded'],
  },

  // -- Characters (user PCs only — iconics stay device-local) -------------
  {
    local: 'characters',
    remote: 'characters',
    pk: ['id'],
    columns: ['id', 'name', 'class', 'level', 'ancestry', 'raw_json', 'notes', 'source_adventure', 'raw_foundry_json', 'created_at'],
    localFilter: "source_adventure IS NULL",
    remoteFilter: 'source_adventure IS NULL',
  },

  // -- Custom content -----------------------------------------------------
  {
    local: 'custom_creatures',
    remote: 'custom_creatures',
    pk: ['id'],
    columns: ['id', 'name', 'level', 'rarity', 'source_type', 'str', 'dex', 'con', 'int', 'wis', 'cha', 'data_json', 'created_at'],
  },
  {
    local: 'custom_items',
    remote: 'custom_items',
    pk: ['id'],
    columns: ['id', 'name', 'item_type', 'level', 'rarity', 'bulk', 'price_gp', 'traits', 'description', 'source_text', 'usage', 'damage_formula', 'damage_type', 'weapon_category', 'weapon_group', 'ac_bonus', 'dex_cap', 'check_penalty', 'speed_penalty', 'strength_req', 'consumable_category', 'uses_max', 'rules_json', 'variants_json', 'base_item_id', 'created_at'],
  },

  // -- Global user config -------------------------------------------------
  // party_config is single-row locally (id=1); on the server it is keyed by
  // user_id. The sync layer special-cases this: local id=1 maps to the user's
  // single remote row. See sync-push/sync-pull for the projection.
  {
    local: 'party_config',
    remote: 'party_config',
    pk: ['id'],
    columns: ['id', 'party_level', 'party_size'],
  },
  {
    local: 'hotkeys',
    remote: 'hotkeys',
    pk: ['id'],
    columns: ['id', 'action', 'chord'],
  },
] as const

/** Quick lookup by local table name. */
export const SYNC_TABLE_BY_LOCAL: ReadonlyMap<string, SyncTableDef> = new Map(
  SYNC_TABLES.map((t) => [t.local, t]),
)

/** True if the given local table participates in cloud sync. */
export function isSyncedTable(tableName: string): boolean {
  return SYNC_TABLE_BY_LOCAL.has(tableName)
}
