import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const pf2eEntities = sqliteTable('pf2e_entities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: text('source_id').notNull(),
  pack: text('pack').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  entityType: text('entity_type').notNull(),
  rawData: text('raw_data').notNull(),
  contentHash: text('content_hash').notNull(),
  syncedAt: text('synced_at').notNull(),
  // STORED generated columns — computed at write time via json_extract on raw_data.
  // DDL defined in migrations.ts v4. level uses COALESCE to handle both NPC
  // ($.system.details.level.value) and character ($.system.level.value) JSON paths.
  // Entities without either path yield NULL (correct for items, spells, etc.).
  level: integer('level').generatedAlwaysAs(
    sql`CAST(COALESCE(json_extract(raw_data, '$.system.details.level.value'), json_extract(raw_data, '$.system.level.value')) AS INTEGER)`,
    { mode: 'stored' }
  ),
  rarity: text('rarity').generatedAlwaysAs(
    sql`json_extract(raw_data, '$.system.traits.rarity')`,
    { mode: 'stored' }
  ),
  family: text('family').generatedAlwaysAs(
    sql`json_extract(raw_data, '$.system.details.family')`,
    { mode: 'stored' }
  ),
}, (table) => ({
  uniquePackSlug: uniqueIndex('idx_pack_slug').on(table.pack, table.slug),
  idxEntityType: index('idx_entity_type').on(table.entityType),
  idxName: index('idx_name').on(table.name),
  idxSourceId: index('idx_source_id').on(table.sourceId),
  idxLevel: index('idx_level').on(table.level),
  idxRarity: index('idx_rarity').on(table.rarity),
  idxEntityTypeLevel: index('idx_entity_type_level').on(table.entityType, table.level),
  idxFamily: index('idx_family').on(table.family),
}));

export const syncState = sqliteTable('sync_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lastRelease: text('last_release'),
  lastSyncAt: text('last_sync_at'),
  totalEntities: integer('total_entities'),
});

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
