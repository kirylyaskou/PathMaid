import { getDb } from '@/shared/db'
import { getItemById, type ItemRow } from './items'

export interface CustomItemRow {
  id: string
  name: string
  item_type: string
  level: number
  rarity: string | null
  bulk: string | null
  price_gp: number | null
  traits: string | null
  description: string | null
  source_text: string | null
  usage: string | null
  damage_formula: string | null
  damage_type: string | null
  weapon_category: string | null
  weapon_group: string | null
  ac_bonus: number | null
  dex_cap: number | null
  check_penalty: number | null
  speed_penalty: number | null
  strength_req: number | null
  consumable_category: string | null
  uses_max: number | null
  rules_json: string
  variants_json: string
  base_item_id: string | null
  created_at: string
  updated_at: string
}

export type CustomItemInput = Omit<CustomItemRow, 'id' | 'created_at' | 'updated_at'>

export interface CustomItemRef {
  id: string
  customItemId: string
  quantity: number
  sortOrder: number
}

export interface EncounterCustomItemRef {
  id: string
  encounterId: string
  combatantId: string
  customItemId: string
  quantity: number
  isRemoved: boolean
}

export interface CustomItemWithQuantity extends CustomItemRow {
  ref_id: string
  quantity: number
  sort_order: number
  is_removed?: boolean
}

function nowISO(): string {
  return new Date().toISOString()
}

function emptyInput(name = 'New Item'): CustomItemInput {
  return {
    name,
    item_type: 'equipment',
    level: 0,
    rarity: 'common',
    bulk: null,
    price_gp: null,
    traits: null,
    description: '',
    source_text: 'Pathmaid Homebrew',
    usage: null,
    damage_formula: null,
    damage_type: null,
    weapon_category: null,
    weapon_group: null,
    ac_bonus: null,
    dex_cap: null,
    check_penalty: null,
    speed_penalty: null,
    strength_req: null,
    consumable_category: null,
    uses_max: null,
    rules_json: '[]',
    variants_json: '[]',
    base_item_id: null,
  }
}

function inputFromCatalogItem(item: ItemRow): CustomItemInput {
  return {
    ...emptyInput(`${item.name} Copy`),
    name: `${item.name} Copy`,
    item_type: item.item_type,
    level: item.level,
    rarity: item.rarity,
    bulk: item.bulk,
    price_gp: item.price_gp,
    traits: item.traits,
    description: item.description,
    source_text: item.source_book ?? 'Pathmaid Homebrew',
    usage: item.usage,
    damage_formula: item.damage_formula,
    damage_type: item.damage_type,
    weapon_category: item.weapon_category,
    weapon_group: item.weapon_group,
    ac_bonus: item.ac_bonus,
    dex_cap: item.dex_cap,
    check_penalty: item.check_penalty,
    speed_penalty: item.speed_penalty,
    strength_req: item.strength_req,
    consumable_category: item.consumable_category,
    uses_max: item.uses_max,
    rules_json: '[]',
    variants_json: '[]',
    base_item_id: item.id,
  }
}

function inputFromCustomItem(item: CustomItemRow): CustomItemInput {
  return {
    name: `${item.name} Copy`,
    item_type: item.item_type,
    level: item.level,
    rarity: item.rarity,
    bulk: item.bulk,
    price_gp: item.price_gp,
    traits: item.traits,
    description: item.description,
    source_text: item.source_text,
    usage: item.usage,
    damage_formula: item.damage_formula,
    damage_type: item.damage_type,
    weapon_category: item.weapon_category,
    weapon_group: item.weapon_group,
    ac_bonus: item.ac_bonus,
    dex_cap: item.dex_cap,
    check_penalty: item.check_penalty,
    speed_penalty: item.speed_penalty,
    strength_req: item.strength_req,
    consumable_category: item.consumable_category,
    uses_max: item.uses_max,
    rules_json: item.rules_json,
    variants_json: item.variants_json,
    base_item_id: item.base_item_id ?? item.id,
  }
}

const CUSTOM_ITEM_COLUMNS = `
  id, name, item_type, level, rarity, bulk, price_gp, traits, description,
  source_text, usage, damage_formula, damage_type, weapon_category, weapon_group,
  ac_bonus, dex_cap, check_penalty, speed_penalty, strength_req,
  consumable_category, uses_max, rules_json, variants_json, base_item_id,
  created_at, updated_at
`

const CUSTOM_ITEM_VALUE_COLUMNS = `
  id, name, item_type, level, rarity, bulk, price_gp, traits, description,
  source_text, usage, damage_formula, damage_type, weapon_category, weapon_group,
  ac_bonus, dex_cap, check_penalty, speed_penalty, strength_req,
  consumable_category, uses_max, rules_json, variants_json, base_item_id,
  created_at, updated_at
`

function inputValues(id: string, input: CustomItemInput, createdAt: string, updatedAt: string): unknown[] {
  return [
    id, input.name, input.item_type, input.level, input.rarity, input.bulk, input.price_gp,
    input.traits, input.description, input.source_text, input.usage,
    input.damage_formula, input.damage_type, input.weapon_category, input.weapon_group,
    input.ac_bonus, input.dex_cap, input.check_penalty, input.speed_penalty, input.strength_req,
    input.consumable_category, input.uses_max, input.rules_json || '[]', input.variants_json || '[]',
    input.base_item_id, createdAt, updatedAt,
  ]
}

export async function listCustomItems(): Promise<CustomItemRow[]> {
  const db = await getDb()
  return db.select<CustomItemRow[]>(
    `SELECT ${CUSTOM_ITEM_COLUMNS} FROM custom_items ORDER BY updated_at DESC`,
    [],
  )
}

export async function searchCustomItems(query: string): Promise<CustomItemRow[]> {
  const db = await getDb()
  const term = query.trim()
  if (!term) return listCustomItems()
  return db.select<CustomItemRow[]>(
    `SELECT ${CUSTOM_ITEM_COLUMNS} FROM custom_items
     WHERE name LIKE ? COLLATE NOCASE
        OR item_type LIKE ? COLLATE NOCASE
        OR traits LIKE ? COLLATE NOCASE
     ORDER BY level ASC, name ASC
     LIMIT 100`,
    [`%${term}%`, `%${term}%`, `%${term}%`],
  )
}

export async function getCustomItemById(id: string): Promise<CustomItemRow | null> {
  const db = await getDb()
  const rows = await db.select<CustomItemRow[]>(
    `SELECT ${CUSTOM_ITEM_COLUMNS} FROM custom_items WHERE id = ?`,
    [id],
  )
  return rows[0] ?? null
}

export async function createCustomItem(input: Partial<CustomItemInput> = {}): Promise<string> {
  const id = `custom-item-${crypto.randomUUID()}`
  const now = nowISO()
  const fullInput = { ...emptyInput(), ...input }
  const db = await getDb()
  await db.execute(
    `INSERT INTO custom_items (${CUSTOM_ITEM_VALUE_COLUMNS})
     VALUES (${Array.from({ length: 27 }, () => '?').join(', ')})`,
    inputValues(id, fullInput, now, now),
  )
  return id
}

export async function updateCustomItem(id: string, input: CustomItemInput): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE custom_items SET
       name=?, item_type=?, level=?, rarity=?, bulk=?, price_gp=?, traits=?, description=?,
       source_text=?, usage=?, damage_formula=?, damage_type=?, weapon_category=?, weapon_group=?,
       ac_bonus=?, dex_cap=?, check_penalty=?, speed_penalty=?, strength_req=?,
       consumable_category=?, uses_max=?, rules_json=?, variants_json=?, base_item_id=?,
       updated_at=?
     WHERE id=?`,
    [
      input.name, input.item_type, input.level, input.rarity, input.bulk, input.price_gp,
      input.traits, input.description, input.source_text, input.usage,
      input.damage_formula, input.damage_type, input.weapon_category, input.weapon_group,
      input.ac_bonus, input.dex_cap, input.check_penalty, input.speed_penalty, input.strength_req,
      input.consumable_category, input.uses_max, input.rules_json || '[]',
      input.variants_json || '[]', input.base_item_id, nowISO(), id,
    ],
  )
}

export async function deleteCustomItem(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_items WHERE id = ?', [id])
}

export async function cloneCatalogItemToCustomItem(itemId: string): Promise<string> {
  const item = await getItemById(itemId)
  if (!item) throw new Error(`Catalog item not found: ${itemId}`)
  return createCustomItem(inputFromCatalogItem(item))
}

export async function cloneCustomItem(id: string): Promise<string> {
  const item = await getCustomItemById(id)
  if (!item) throw new Error(`Custom item not found: ${id}`)
  return createCustomItem(inputFromCustomItem(item))
}

export async function getCustomItemsByIds(ids: string[]): Promise<CustomItemRow[]> {
  if (ids.length === 0) return []
  const db = await getDb()
  const placeholders = ids.map(() => '?').join(', ')
  return db.select<CustomItemRow[]>(
    `SELECT ${CUSTOM_ITEM_COLUMNS} FROM custom_items WHERE id IN (${placeholders})`,
    ids,
  )
}

export async function loadEncounterCustomItemRefs(
  encounterId: string,
  combatantId: string,
): Promise<EncounterCustomItemRef[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string
    encounter_id: string
    combatant_id: string
    custom_item_id: string
    quantity: number
    is_removed: number
  }>>(
    `SELECT id, encounter_id, combatant_id, custom_item_id, quantity, is_removed
     FROM encounter_combatant_custom_items
     WHERE encounter_id = ? AND combatant_id = ?`,
    [encounterId, combatantId],
  )
  return rows.map((row) => ({
    id: row.id,
    encounterId: row.encounter_id,
    combatantId: row.combatant_id,
    customItemId: row.custom_item_id,
    quantity: row.quantity,
    isRemoved: row.is_removed === 1,
  }))
}

export async function upsertEncounterCustomItemRef(ref: EncounterCustomItemRef): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO encounter_combatant_custom_items
       (id, encounter_id, combatant_id, custom_item_id, quantity, is_removed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ref.id, ref.encounterId, ref.combatantId, ref.customItemId, ref.quantity, ref.isRemoved ? 1 : 0],
  )
}

export async function deleteEncounterCustomItemRef(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM encounter_combatant_custom_items WHERE id = ?', [id])
}

export async function resolveCustomItemRefs(
  refs: readonly CustomItemRef[],
): Promise<CustomItemWithQuantity[]> {
  const items = await getCustomItemsByIds(Array.from(new Set(refs.map((ref) => ref.customItemId))))
  const byId = new Map(items.map((item) => [item.id, item]))
  return refs.flatMap((ref) => {
    const item = byId.get(ref.customItemId)
    return item
      ? [{ ...item, ref_id: ref.id, quantity: ref.quantity, sort_order: ref.sortOrder }]
      : []
  })
}

export async function resolveEncounterCustomItemRefs(
  encounterId: string,
  combatantId: string,
): Promise<CustomItemWithQuantity[]> {
  const refs = await loadEncounterCustomItemRefs(encounterId, combatantId)
  const items = await getCustomItemsByIds(Array.from(new Set(refs.map((ref) => ref.customItemId))))
  const byId = new Map(items.map((item) => [item.id, item]))
  return refs.flatMap((ref, index) => {
    const item = byId.get(ref.customItemId)
    return item
      ? [{
          ...item,
          ref_id: ref.id,
          quantity: ref.quantity,
          sort_order: index,
          is_removed: ref.isRemoved,
        }]
      : []
  })
}
