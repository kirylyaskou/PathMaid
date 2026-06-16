import { getDb } from '@/shared/db'

export interface EncounterLootSettingsRow {
  encounterId: string
  autoFromEnemies: boolean
  updatedAt: string
}

export interface EncounterLootEntryRow {
  id: string
  encounterId: string
  itemId: string | null
  name: string
  itemType: string | null
  quantity: number
  priceGp: number | null
  bulk: string | null
  notes: string | null
  sortOrder: number
}

export interface EncounterLootStateRow {
  id: string
  encounterId: string
  combatantId: string | null
  sourceItemKey: string
  sourceItemKind: 'base' | 'encounter' | 'custom' | 'additional'
  spentQuantity: number
  excluded: boolean
  updatedAt: string
}

export interface EncounterLootCombatantSourceRow {
  id: string
  creatureRef: string
  displayName: string
  isNPC: boolean
  isHazard: boolean
}

export interface EncounterLootBaseItemSourceRow {
  id: string
  creatureId: string
  name: string
  itemType: string
  foundryItemId: string | null
  quantity: number
  priceGp: number | null
  bulk: string | null
  sortOrder: number
}

export interface EncounterLootItemOverrideSourceRow {
  id: string
  combatantId: string
  name: string
  itemType: string
  itemFoundryId: string | null
  quantity: number
  priceGp: number | null
  bulk: string | null
  isRemoved: boolean
}

export interface EncounterLootCustomItemSourceRow {
  refId: string
  combatantId: string
  customItemId: string
  name: string
  itemType: string
  quantity: number
  priceGp: number | null
  bulk: string | null
  isRemoved: boolean
  sortOrder: number
}

export interface EncounterLootSources {
  combatants: EncounterLootCombatantSourceRow[]
  baseItems: EncounterLootBaseItemSourceRow[]
  itemOverrides: EncounterLootItemOverrideSourceRow[]
  customItems: EncounterLootCustomItemSourceRow[]
}

export type EncounterLootEntryInput = Omit<EncounterLootEntryRow, 'id'>

interface CustomCreatureLootRef {
  refId: string
  combatantId: string
  customItemId: string
  quantity: number
  sortOrder: number
}

interface CustomCreatureLootEquipment {
  id: string
  creatureId: string
  name: string
  itemType: string
  foundryItemId: string | null
  quantity: number
  bulk: string | null
  sortOrder: number
}

function mapSettingsRow(row: {
  encounter_id: string
  auto_from_enemies: number
  updated_at: string
}): EncounterLootSettingsRow {
  return {
    encounterId: row.encounter_id,
    autoFromEnemies: row.auto_from_enemies === 1,
    updatedAt: row.updated_at,
  }
}

function mapEntryRow(row: {
  id: string
  encounter_id: string
  item_id: string | null
  name: string
  item_type: string | null
  quantity: number
  price_gp: number | null
  bulk: string | null
  notes: string | null
  sort_order: number
}): EncounterLootEntryRow {
  return {
    id: row.id,
    encounterId: row.encounter_id,
    itemId: row.item_id,
    name: row.name,
    itemType: row.item_type,
    quantity: row.quantity,
    priceGp: row.price_gp,
    bulk: row.bulk,
    notes: row.notes,
    sortOrder: row.sort_order,
  }
}

function mapStateRow(row: {
  id: string
  encounter_id: string
  combatant_id: string | null
  source_item_key: string
  source_item_kind: string
  spent_quantity: number
  excluded: number
  updated_at: string
}): EncounterLootStateRow {
  return {
    id: row.id,
    encounterId: row.encounter_id,
    combatantId: row.combatant_id,
    sourceItemKey: row.source_item_key,
    sourceItemKind: row.source_item_kind as EncounterLootStateRow['sourceItemKind'],
    spentQuantity: row.spent_quantity,
    excluded: row.excluded === 1,
    updatedAt: row.updated_at,
  }
}

function parseCustomCreatureLootRefs(
  combatantId: string,
  dataJson: string,
): CustomCreatureLootRef[] {
  try {
    const parsed = JSON.parse(dataJson) as { customItemRefs?: unknown }
    if (!Array.isArray(parsed.customItemRefs)) return []
    return parsed.customItemRefs.flatMap((ref, index) => {
      if (!ref || typeof ref !== 'object') return []
      const candidate = ref as {
        id?: unknown
        customItemId?: unknown
        quantity?: unknown
        sortOrder?: unknown
      }
      if (typeof candidate.customItemId !== 'string') return []
      return [{
        refId: typeof candidate.id === 'string'
          ? candidate.id
          : `${combatantId}:custom-item:${candidate.customItemId}`,
        combatantId,
        customItemId: candidate.customItemId,
        quantity: typeof candidate.quantity === 'number' ? candidate.quantity : 1,
        sortOrder: typeof candidate.sortOrder === 'number' ? candidate.sortOrder : index,
      }]
    })
  } catch {
    return []
  }
}

function parseCustomCreatureLootEquipment(
  creatureId: string,
  dataJson: string,
): CustomCreatureLootEquipment[] {
  try {
    const parsed = JSON.parse(dataJson) as { equipment?: unknown }
    if (!Array.isArray(parsed.equipment)) return []
    return parsed.equipment.flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []
      const candidate = item as {
        id?: unknown
        item_name?: unknown
        item_type?: unknown
        foundry_item_id?: unknown
        quantity?: unknown
        bulk?: unknown
        sort_order?: unknown
      }
      if (typeof candidate.item_name !== 'string' || typeof candidate.item_type !== 'string') return []
      return [{
        id: typeof candidate.id === 'string'
          ? candidate.id
          : `${creatureId}:equipment:${candidate.item_name}:${index}`,
        creatureId,
        name: candidate.item_name,
        itemType: candidate.item_type,
        foundryItemId: typeof candidate.foundry_item_id === 'string' ? candidate.foundry_item_id : null,
        quantity: typeof candidate.quantity === 'number' ? candidate.quantity : 1,
        bulk: typeof candidate.bulk === 'string' ? candidate.bulk : null,
        sortOrder: typeof candidate.sort_order === 'number' ? candidate.sort_order : index,
      }]
    })
  } catch {
    return []
  }
}

export async function getEncounterLootSettings(encounterId: string): Promise<EncounterLootSettingsRow> {
  const db = await getDb()
  const rows = await db.select<Array<{
    encounter_id: string
    auto_from_enemies: number
    updated_at: string
  }>>(
    `SELECT encounter_id, auto_from_enemies, updated_at
     FROM encounter_loot_settings
     WHERE encounter_id = ?`,
    [encounterId],
  )
  return rows[0]
    ? mapSettingsRow(rows[0])
    : { encounterId, autoFromEnemies: true, updatedAt: new Date().toISOString() }
}

export async function saveEncounterLootSettings(
  encounterId: string,
  autoFromEnemies: boolean,
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO encounter_loot_settings (encounter_id, auto_from_enemies, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(encounter_id) DO UPDATE SET
       auto_from_enemies = excluded.auto_from_enemies,
       updated_at = CURRENT_TIMESTAMP`,
    [encounterId, autoFromEnemies ? 1 : 0],
  )
}

export async function listEncounterLootEntries(encounterId: string): Promise<EncounterLootEntryRow[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string
    encounter_id: string
    item_id: string | null
    name: string
    item_type: string | null
    quantity: number
    price_gp: number | null
    bulk: string | null
    notes: string | null
    sort_order: number
  }>>(
    `SELECT id, encounter_id, item_id, name, item_type, quantity, price_gp, bulk, notes, sort_order
     FROM encounter_loot_entries
     WHERE encounter_id = ?
     ORDER BY sort_order, name`,
    [encounterId],
  )
  return rows.map(mapEntryRow)
}

export async function createEncounterLootEntry(input: EncounterLootEntryInput): Promise<string> {
  const id = `encounter-loot-${crypto.randomUUID()}`
  await upsertEncounterLootEntry({ ...input, id })
  return id
}

export async function upsertEncounterLootEntry(entry: EncounterLootEntryRow): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO encounter_loot_entries
       (id, encounter_id, item_id, name, item_type, quantity, price_gp, bulk, notes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.encounterId,
      entry.itemId,
      entry.name,
      entry.itemType,
      entry.quantity,
      entry.priceGp,
      entry.bulk,
      entry.notes,
      entry.sortOrder,
    ],
  )
}

export async function deleteEncounterLootEntry(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM encounter_loot_entries WHERE id = ?', [id])
}

export async function listEncounterLootState(encounterId: string): Promise<EncounterLootStateRow[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string
    encounter_id: string
    combatant_id: string | null
    source_item_key: string
    source_item_kind: string
    spent_quantity: number
    excluded: number
    updated_at: string
  }>>(
    `SELECT id, encounter_id, combatant_id, source_item_key, source_item_kind,
            spent_quantity, excluded, updated_at
     FROM encounter_loot_state
     WHERE encounter_id = ?`,
    [encounterId],
  )
  return rows.map(mapStateRow)
}

export async function upsertEncounterLootState(state: EncounterLootStateRow): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO encounter_loot_state
       (id, encounter_id, combatant_id, source_item_key, source_item_kind, spent_quantity, excluded, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT DO UPDATE SET
       source_item_kind = excluded.source_item_kind,
       spent_quantity = excluded.spent_quantity,
       excluded = excluded.excluded,
       updated_at = CURRENT_TIMESTAMP`,
    [
      state.id,
      state.encounterId,
      state.combatantId,
      state.sourceItemKey,
      state.sourceItemKind,
      state.spentQuantity,
      state.excluded ? 1 : 0,
    ],
  )
}

export async function setEncounterLootItemState(
  encounterId: string,
  combatantId: string | null,
  sourceItemKey: string,
  sourceItemKind: EncounterLootStateRow['sourceItemKind'],
  spentQuantity: number,
  excluded: boolean,
): Promise<void> {
  await upsertEncounterLootState({
    id: `encounter-loot-state-${crypto.randomUUID()}`,
    encounterId,
    combatantId,
    sourceItemKey,
    sourceItemKind,
    spentQuantity,
    excluded,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteEncounterLootState(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM encounter_loot_state WHERE id = ?', [id])
}

export async function loadEncounterLootSources(encounterId: string): Promise<EncounterLootSources> {
  const db = await getDb()
  const combatantRows = await db.select<Array<{
    id: string
    creature_ref: string | null
    display_name: string
    is_npc: number
    is_hazard: number
  }>>(
    `SELECT id, creature_ref, display_name, is_npc, is_hazard
     FROM encounter_combatants
     WHERE encounter_id = ?
       AND COALESCE(side, 'enemy') = 'enemy'
     ORDER BY sort_order`,
    [encounterId],
  )
  const combatants = combatantRows.map((row) => ({
    id: row.id,
    creatureRef: row.creature_ref ?? '',
    displayName: row.display_name,
    isNPC: row.is_npc === 1,
    isHazard: row.is_hazard === 1,
  }))

  const baseRows = await db.select<Array<{
    id: string
    creature_id: string
    item_name: string
    item_type: string
    foundry_item_id: string | null
    quantity: number
    price_gp: number | null
    bulk: string | null
    sort_order: number
  }>>(
    `SELECT DISTINCT ci.id, ci.creature_id, ci.item_name, ci.item_type, ci.foundry_item_id,
            ci.quantity, i.price_gp, COALESCE(ci.bulk, i.bulk) AS bulk, ci.sort_order
     FROM creature_items ci
     JOIN encounter_combatants ec ON ec.creature_ref = ci.creature_id
     LEFT JOIN items i ON i.id = ci.foundry_item_id
     WHERE ec.encounter_id = ?
       AND ec.is_npc = 1
       AND ec.is_hazard = 0
       AND COALESCE(ec.side, 'enemy') = 'enemy'
     ORDER BY ec.sort_order, ci.sort_order`,
    [encounterId],
  )
  const baseItems = baseRows.map((row) => ({
    id: row.id,
    creatureId: row.creature_id,
    name: row.item_name,
    itemType: row.item_type,
    foundryItemId: row.foundry_item_id,
    quantity: row.quantity,
    priceGp: row.price_gp,
    bulk: row.bulk,
    sortOrder: row.sort_order,
  }))

  const overrideRows = await db.select<Array<{
    id: string
    combatant_id: string
    item_name: string
    item_type: string
    item_foundry_id: string | null
    quantity: number
    price_gp: number | null
    bulk: string | null
    is_removed: number
  }>>(
    `SELECT eci.id, eci.combatant_id, eci.item_name, eci.item_type, eci.item_foundry_id,
            eci.quantity, i.price_gp, i.bulk, eci.is_removed
     FROM encounter_combatant_items eci
     JOIN encounter_combatants ec ON ec.id = eci.combatant_id
     LEFT JOIN items i ON i.id = eci.item_foundry_id
     WHERE eci.encounter_id = ?
       AND ec.is_npc = 1
       AND ec.is_hazard = 0
       AND COALESCE(ec.side, 'enemy') = 'enemy'`,
    [encounterId],
  )
  const itemOverrides = overrideRows.map((row) => ({
    id: row.id,
    combatantId: row.combatant_id,
    name: row.item_name,
    itemType: row.item_type,
    itemFoundryId: row.item_foundry_id,
    quantity: row.quantity,
    priceGp: row.price_gp,
    bulk: row.bulk,
    isRemoved: row.is_removed === 1,
  }))

  const customRows = await db.select<Array<{
    ref_id: string
    combatant_id: string
    custom_item_id: string
    name: string
    item_type: string
    quantity: number
    price_gp: number | null
    bulk: string | null
    is_removed: number
    sort_order: number
  }>>(
    `SELECT ecci.id AS ref_id, ecci.combatant_id, ecci.custom_item_id,
            ci.name, ci.item_type, ecci.quantity, ci.price_gp, ci.bulk,
            ecci.is_removed, ec.sort_order
     FROM encounter_combatant_custom_items ecci
     JOIN encounter_combatants ec ON ec.id = ecci.combatant_id
     JOIN custom_items ci ON ci.id = ecci.custom_item_id
     WHERE ecci.encounter_id = ?
       AND ec.is_npc = 1
       AND ec.is_hazard = 0
       AND COALESCE(ec.side, 'enemy') = 'enemy'`,
    [encounterId],
  )
  const customItems = customRows.map((row) => ({
    refId: row.ref_id,
    combatantId: row.combatant_id,
    customItemId: row.custom_item_id,
    name: row.name,
    itemType: row.item_type,
    quantity: row.quantity,
    priceGp: row.price_gp,
    bulk: row.bulk,
    isRemoved: row.is_removed === 1,
    sortOrder: row.sort_order,
  }))

  const customCreatureRows = await db.select<Array<{
    combatant_id: string
    creature_ref: string
    data_json: string
  }>>(
    `SELECT ec.id AS combatant_id, ec.creature_ref, cc.data_json
     FROM encounter_combatants ec
     JOIN custom_creatures cc ON cc.id = ec.creature_ref
     WHERE ec.encounter_id = ?
       AND ec.is_npc = 1
       AND ec.is_hazard = 0
       AND COALESCE(ec.side, 'enemy') = 'enemy'`,
    [encounterId],
  )
  const customCreatureEquipment = customCreatureRows.flatMap((row) =>
    parseCustomCreatureLootEquipment(row.creature_ref, row.data_json)
  )
  const baseCustomRefs = customCreatureRows.flatMap((row) =>
    parseCustomCreatureLootRefs(row.combatant_id, row.data_json)
  )
  let customCreatureBaseItems: EncounterLootBaseItemSourceRow[] = []
  const customCreatureFoundryIds = Array.from(new Set(
    customCreatureEquipment.flatMap((item) => item.foundryItemId ? [item.foundryItemId] : []),
  ))
  if (customCreatureFoundryIds.length > 0) {
    const itemPlaceholders = customCreatureFoundryIds.map(() => '?').join(', ')
    const itemRows = await db.select<Array<{
      id: string
      price_gp: number | null
      bulk: string | null
    }>>(
      `SELECT id, price_gp, bulk FROM items WHERE id IN (${itemPlaceholders})`,
      customCreatureFoundryIds,
    )
    const itemById = new Map(itemRows.map((row) => [row.id, row]))
    customCreatureBaseItems = customCreatureEquipment.map((item) => {
      const catalogItem = item.foundryItemId ? itemById.get(item.foundryItemId) : undefined
      return {
        id: item.id,
        creatureId: item.creatureId,
        name: item.name,
        itemType: item.itemType,
        foundryItemId: item.foundryItemId,
        quantity: item.quantity,
        priceGp: catalogItem?.price_gp ?? null,
        bulk: item.bulk ?? catalogItem?.bulk ?? null,
        sortOrder: item.sortOrder,
      }
    })
  } else {
    customCreatureBaseItems = customCreatureEquipment.map((item) => ({
      id: item.id,
      creatureId: item.creatureId,
      name: item.name,
      itemType: item.itemType,
      foundryItemId: item.foundryItemId,
      quantity: item.quantity,
      priceGp: null,
      bulk: item.bulk,
      sortOrder: item.sortOrder,
    }))
  }
  const removedCustomRefs = new Set(
    customItems
      .filter((item) => item.isRemoved)
      .map((item) => `${item.combatantId}\u0000${item.customItemId}`),
  )
  const visibleBaseCustomRefs = baseCustomRefs.filter((ref) =>
    !removedCustomRefs.has(`${ref.combatantId}\u0000${ref.customItemId}`)
  )

  if (visibleBaseCustomRefs.length === 0) {
    return { combatants, baseItems: [...baseItems, ...customCreatureBaseItems], itemOverrides, customItems }
  }

  const customItemIds = Array.from(new Set(visibleBaseCustomRefs.map((ref) => ref.customItemId)))
  const customPlaceholders = customItemIds.map(() => '?').join(', ')
  const baseCustomRows = await db.select<Array<{
    id: string
    name: string
    item_type: string
    price_gp: number | null
    bulk: string | null
  }>>(
    `SELECT id, name, item_type, price_gp, bulk
     FROM custom_items
     WHERE id IN (${customPlaceholders})`,
    customItemIds,
  )
  const customItemById = new Map(baseCustomRows.map((row) => [row.id, row]))
  const baseCustomItems = visibleBaseCustomRefs.flatMap((ref) => {
    const item = customItemById.get(ref.customItemId)
    return item
      ? [{
          refId: ref.refId,
          combatantId: ref.combatantId,
          customItemId: ref.customItemId,
          name: item.name,
          itemType: item.item_type,
          quantity: ref.quantity,
          priceGp: item.price_gp,
          bulk: item.bulk,
          isRemoved: false,
          sortOrder: ref.sortOrder,
        }]
      : []
  })

  return {
    combatants,
    baseItems: [...baseItems, ...customCreatureBaseItems],
    itemOverrides,
    customItems: [...baseCustomItems, ...customItems],
  }
}

export async function clearEncounterLootRuntimeState(encounterId: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM encounter_loot_state WHERE encounter_id = ?', [encounterId])
}
