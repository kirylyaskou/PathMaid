import type {
  EncounterLootBaseItem,
  EncounterLootGroup,
  EncounterLootItemOverride,
  EncounterLootSourceKind,
  EncounterLootState,
  ResolveEncounterLootInput,
  ResolvedEncounterLoot,
  ResolvedEncounterLootItem,
} from './types'

const TYPE_ORDER = ['weapon', 'armor', 'shield', 'consumable', 'treasure', 'equipment']

function stateKey(
  combatantId: string | null,
  sourceItemKind: EncounterLootSourceKind,
  sourceItemKey: string,
): string {
  return `${combatantId ?? ''}\u0000${sourceItemKind}\u0000${sourceItemKey}`
}

function baseRemovalKey(item: EncounterLootBaseItem): string {
  return item.foundryItemId ?? item.name
}

function overrideRemovalKey(item: EncounterLootItemOverride): string {
  return item.itemFoundryId ?? item.name
}

function clampQuantity(value: number): number {
  return Math.max(0, Math.floor(value))
}

function applyState(
  item: Omit<ResolvedEncounterLootItem, 'remainingQuantity' | 'spentQuantity'>,
  state: EncounterLootState | undefined,
): ResolvedEncounterLootItem | null {
  if (state?.excluded) return null
  const spentQuantity = clampQuantity(state?.spentQuantity ?? 0)
  const remainingQuantity = clampQuantity(item.quantity - spentQuantity)
  if (remainingQuantity <= 0) return null
  return { ...item, spentQuantity, remainingQuantity }
}

function parseBulkUnit(bulk: string | null): number {
  if (!bulk) return 0
  const normalized = bulk.trim().toLowerCase()
  if (!normalized || normalized === '-' || normalized === '—' || normalized === 'l') {
    return normalized === 'l' ? 0.1 : 0
  }
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function itemTypeRank(itemType: string | null): number {
  const index = TYPE_ORDER.indexOf(itemType ?? '')
  return index === -1 ? TYPE_ORDER.length : index
}

function compareLootItems(a: ResolvedEncounterLootItem, b: ResolvedEncounterLootItem): number {
  const typeDelta = itemTypeRank(a.itemType) - itemTypeRank(b.itemType)
  if (typeDelta !== 0) return typeDelta
  if (a.combatantName !== b.combatantName) {
    return (a.combatantName ?? '').localeCompare(b.combatantName ?? '')
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.name.localeCompare(b.name)
}

export function resolveEncounterLoot(input: ResolveEncounterLootInput): ResolvedEncounterLoot {
  const combatants = input.combatants.filter((combatant) => combatant.isNPC && !combatant.isHazard)
  const combatantById = new Map(combatants.map((combatant) => [combatant.id, combatant]))
  const stateByKey = new Map(
    input.state.map((row) => [stateKey(row.combatantId, row.sourceItemKind, row.sourceItemKey), row]),
  )
  const removedByCombatant = new Map<string, Set<string>>()
  const items: ResolvedEncounterLootItem[] = []

  for (const override of input.itemOverrides) {
    if (!override.isRemoved) continue
    const removed = removedByCombatant.get(override.combatantId) ?? new Set<string>()
    removed.add(overrideRemovalKey(override))
    removedByCombatant.set(override.combatantId, removed)
  }

  if (input.settings.autoFromEnemies) {
    const baseItemsByCreature = new Map<string, EncounterLootBaseItem[]>()
    for (const item of input.baseItems) {
      const list = baseItemsByCreature.get(item.creatureId) ?? []
      list.push(item)
      baseItemsByCreature.set(item.creatureId, list)
    }

    for (const combatant of combatants) {
      const removed = removedByCombatant.get(combatant.id)
      for (const item of baseItemsByCreature.get(combatant.creatureRef) ?? []) {
        if (removed?.has(baseRemovalKey(item))) continue
        const sourceItemKey = item.id
        const resolved = applyState(
          {
            sourceItemKey,
            sourceItemKind: 'base',
            combatantId: combatant.id,
            combatantName: combatant.displayName,
            name: item.name,
            itemType: item.itemType,
            quantity: clampQuantity(item.quantity),
            priceGp: item.priceGp,
            bulk: item.bulk,
            notes: null,
            sortOrder: item.sortOrder,
          },
          stateByKey.get(stateKey(combatant.id, 'base', sourceItemKey)),
        )
        if (resolved) items.push(resolved)
      }
    }

    for (const override of input.itemOverrides) {
      const combatant = combatantById.get(override.combatantId)
      if (!combatant || override.isRemoved) continue
      const sourceItemKey = override.id
      const resolved = applyState(
        {
          sourceItemKey,
          sourceItemKind: 'encounter',
          combatantId: override.combatantId,
          combatantName: combatant.displayName,
          name: override.name,
          itemType: override.itemType,
          quantity: clampQuantity(override.quantity),
          priceGp: override.priceGp,
          bulk: override.bulk,
          notes: null,
          sortOrder: 10000,
        },
        stateByKey.get(stateKey(override.combatantId, 'encounter', sourceItemKey)),
      )
      if (resolved) items.push(resolved)
    }

    for (const customItem of input.customItems) {
      const combatant = combatantById.get(customItem.combatantId)
      if (!combatant || customItem.isRemoved) continue
      const sourceItemKey = customItem.refId
      const resolved = applyState(
        {
          sourceItemKey,
          sourceItemKind: 'custom',
          combatantId: customItem.combatantId,
          combatantName: combatant.displayName,
          name: customItem.name,
          itemType: customItem.itemType,
          quantity: clampQuantity(customItem.quantity),
          priceGp: customItem.priceGp,
          bulk: customItem.bulk,
          notes: null,
          sortOrder: 20000 + customItem.sortOrder,
        },
        stateByKey.get(stateKey(customItem.combatantId, 'custom', sourceItemKey)),
      )
      if (resolved) items.push(resolved)
    }
  }

  for (const entry of input.additionalEntries) {
    const quantity = clampQuantity(entry.quantity)
    if (quantity <= 0) continue
    const resolved = applyState(
      {
        sourceItemKey: entry.id,
        sourceItemKind: 'additional',
        combatantId: null,
        combatantName: null,
        name: entry.name,
        itemType: entry.itemType,
        quantity,
        priceGp: entry.priceGp,
        bulk: entry.bulk,
        notes: entry.notes,
        sortOrder: 30000 + entry.sortOrder,
      },
      stateByKey.get(stateKey(null, 'additional', entry.id)),
    )
    if (resolved) items.push(resolved)
  }

  items.sort(compareLootItems)

  return {
    items,
    summary: {
      totalGp: items.reduce((sum, item) => sum + (item.priceGp ?? 0) * item.remainingQuantity, 0),
      totalBulk: items.reduce((sum, item) => sum + parseBulkUnit(item.bulk) * item.remainingQuantity, 0),
    },
  }
}

export function groupEncounterLootItems(items: readonly ResolvedEncounterLootItem[]): EncounterLootGroup[] {
  const groups = new Map<string, ResolvedEncounterLootItem[]>()
  for (const item of items) {
    const key = itemTypeGroup(item.itemType)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return ['weapon', 'armor', 'consumable', 'treasure', 'other']
    .map((key) => ({ key, label: itemTypeGroupLabel(key), items: groups.get(key) ?? [] }))
    .filter((group) => group.items.length > 0)
}

export function itemTypeGroup(itemType: string | null): string {
  if (itemType === 'weapon') return 'weapon'
  if (itemType === 'armor' || itemType === 'shield') return 'armor'
  if (itemType === 'consumable') return 'consumable'
  if (itemType === 'treasure') return 'treasure'
  return 'other'
}

export function itemTypeGroupLabel(group: string): string {
  switch (group) {
    case 'weapon':
      return 'Weapons'
    case 'armor':
      return 'Armor & Shields'
    case 'consumable':
      return 'Consumables'
    case 'treasure':
      return 'Treasure'
    default:
      return 'Other'
  }
}

export function sourceKindLabel(kind: EncounterLootSourceKind): string {
  switch (kind) {
    case 'base':
      return 'Base'
    case 'encounter':
      return 'Encounter'
    case 'custom':
      return 'Custom'
    case 'additional':
      return 'Additional'
  }
}
