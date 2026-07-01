export type EncounterLootSourceKind = 'base' | 'encounter' | 'custom' | 'additional'

export interface EncounterLootSettings {
  encounterId: string
  autoFromEnemies: boolean
}

export interface EncounterLootCombatant {
  id: string
  creatureRef: string
  displayName: string
  isNPC: boolean
  isHazard: boolean
}

export interface EncounterLootBaseItem {
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

export interface EncounterLootItemOverride {
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

export interface EncounterLootCustomItem {
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

export interface EncounterLootEntry {
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

export interface EncounterLootState {
  id: string
  encounterId: string
  combatantId: string | null
  sourceItemKey: string
  sourceItemKind: EncounterLootSourceKind
  spentQuantity: number
  excluded: boolean
}

export interface ResolveEncounterLootInput {
  settings: EncounterLootSettings
  combatants: EncounterLootCombatant[]
  baseItems: EncounterLootBaseItem[]
  itemOverrides: EncounterLootItemOverride[]
  customItems: EncounterLootCustomItem[]
  additionalEntries: EncounterLootEntry[]
  state: EncounterLootState[]
}

export interface ResolvedEncounterLootItem {
  sourceItemKey: string
  sourceItemKind: EncounterLootSourceKind
  combatantId: string | null
  combatantName: string | null
  name: string
  itemType: string | null
  quantity: number
  remainingQuantity: number
  spentQuantity: number
  priceGp: number | null
  bulk: string | null
  notes: string | null
  sortOrder: number
}

export interface EncounterLootSummary {
  totalGp: number
  totalBulk: number
}

export interface ResolvedEncounterLoot {
  items: ResolvedEncounterLootItem[]
  summary: EncounterLootSummary
}

export interface EncounterLootGroup {
  key: string
  label: string
  items: ResolvedEncounterLootItem[]
}
