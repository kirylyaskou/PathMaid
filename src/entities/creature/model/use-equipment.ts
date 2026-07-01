import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  loadItemOverrides,
  upsertItemOverride,
  deleteItemOverride,
  searchItems,
  searchCustomItems,
  loadEncounterCustomItemRefs,
  upsertEncounterCustomItemRef,
  deleteEncounterCustomItemRef,
  listEncounterLootState,
  setEncounterLootItemState,
} from '@/shared/api'
import type {
  CreatureItemRow,
  EncounterCustomItemRef,
  EncounterItemRow,
  CustomItemRow,
  ItemRow,
  EncounterLootStateRow,
} from '@/shared/api'
import { logError } from '@/shared/lib/error'
import { formatEquipmentDamageFormula, parseInlineDamageFormula } from '../lib/equipment-strike'

interface EncounterContext {
  encounterId: string
  combatantId: string
  inventoryVersion?: number
  onInventoryChanged?: () => void
}

type EquipmentLootSourceKind = 'base' | 'encounter' | 'custom'

export function useEquipment(
  items: CreatureItemRow[],
  encounterContext?: EncounterContext,
) {
  const [overrides, setOverrides] = useState<EncounterItemRow[]>([])
  const [customOverrides, setCustomOverrides] = useState<EncounterCustomItemRef[]>([])
  const [lootState, setLootState] = useState<EncounterLootStateRow[]>([])
  const lootStateRef = useRef<EncounterLootStateRow[]>([])
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<ItemRow[]>([])
  const [customAddResults, setCustomAddResults] = useState<CustomItemRow[]>([])
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!encounterContext) return
    Promise.all([
      loadItemOverrides(encounterContext.encounterId, encounterContext.combatantId),
      loadEncounterCustomItemRefs(encounterContext.encounterId, encounterContext.combatantId),
      listEncounterLootState(encounterContext.encounterId),
    ])
      .then(([itemRows, customRows, lootRows]) => {
        const combatantLootRows = lootRows.filter((row) => row.combatantId === encounterContext.combatantId)
        setOverrides(itemRows)
        setCustomOverrides(customRows)
        lootStateRef.current = combatantLootRows
        setLootState(combatantLootRows)
      })
      .catch(logError('load-item-overrides'))
  }, [
    encounterContext?.encounterId,
    encounterContext?.combatantId,
    encounterContext?.inventoryVersion,
  ])

  const encounterId = encounterContext?.encounterId
  const combatantId = encounterContext?.combatantId

  useEffect(() => {
    if (!encounterId || !combatantId || !addQuery.trim()) {
      setAddResults([])
      setCustomAddResults([])
      return
    }
    const timer = setTimeout(() => {
      Promise.all([searchItems(addQuery), searchCustomItems(addQuery)])
        .then(([items, customItems]) => {
          setAddResults(items.slice(0, 8))
          setCustomAddResults(customItems.slice(0, 8))
        })
        .catch(logError('search-items'))
    }, 200)
    return () => clearTimeout(timer)
  }, [addQuery, combatantId, encounterId])

  const handleRemove = useCallback(async (item: CreatureItemRow) => {
    if (!encounterContext) return
    const override: EncounterItemRow = {
      id: `${encounterContext.encounterId}:${encounterContext.combatantId}:${item.id}`,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      itemName: item.item_name,
      itemFoundryId: item.foundry_item_id,
      itemType: item.item_type,
      quantity: item.quantity,
      damageFormula: item.damage_formula,
      acBonus: item.ac_bonus,
      isRemoved: true,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== override.id), override])
    await upsertItemOverride(override).catch(logError('upsert-item-override'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleRemoveBaseCustom = useCallback(async (customItemId: string) => {
    if (!encounterContext) return
    const override: EncounterCustomItemRef = {
      id: `${encounterContext.encounterId}:${encounterContext.combatantId}:custom:${customItemId}`,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      customItemId,
      quantity: 1,
      isRemoved: true,
    }
    setCustomOverrides((prev) => [...prev.filter((o) => o.id !== override.id), override])
    await upsertEncounterCustomItemRef(override).catch(logError('upsert-custom-item-override'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleRestoreBaseCustom = useCallback(async (id: string) => {
    setCustomOverrides((prev) => prev.filter((o) => o.id !== id))
    await deleteEncounterCustomItemRef(id).catch(logError('delete-custom-item-override'))
    encounterContext?.onInventoryChanged?.()
  }, [encounterContext])

  const handleRestoreBase = useCallback(async (item: CreatureItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:${item.id}`
    setOverrides((prev) => prev.filter((o) => o.id !== id))
    await deleteItemOverride(id).catch(logError('delete-item-override'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleAddItem = useCallback(async (catalogItem: ItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:added:${catalogItem.id}`
    const override: EncounterItemRow = {
      id,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      itemName: catalogItem.name,
      itemFoundryId: catalogItem.id,
      itemType: catalogItem.item_type,
      quantity: 1,
      damageFormula:
        formatEquipmentDamageFormula(catalogItem.damage_formula, catalogItem.damage_type, catalogItem.description) ??
        parseInlineDamageFormula(catalogItem.description)?.formula ??
        null,
      acBonus: catalogItem.ac_bonus,
      isRemoved: false,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    setAddQuery('')
    setAddResults([])
    await upsertItemOverride(override).catch(logError('upsert-item-override'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleAddCustomItem = useCallback(async (customItem: CustomItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:added-custom:${customItem.id}`
    const override: EncounterCustomItemRef = {
      id,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      customItemId: customItem.id,
      quantity: 1,
      isRemoved: false,
    }
    setCustomOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    setAddQuery('')
    setAddResults([])
    setCustomAddResults([])
    await upsertEncounterCustomItemRef(override).catch(logError('upsert-custom-item-override'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleRemoveAdded = useCallback(async (override: EncounterItemRow) => {
    setOverrides((prev) => prev.filter((o) => o.id !== override.id))
    await deleteItemOverride(override.id).catch(logError('delete-item-override'))
    encounterContext?.onInventoryChanged?.()
  }, [encounterContext])

  const handleRemoveAddedCustom = useCallback(async (override: EncounterCustomItemRef) => {
    setCustomOverrides((prev) => prev.filter((o) => o.id !== override.id))
    await deleteEncounterCustomItemRef(override.id).catch(logError('delete-custom-item-override'))
    encounterContext?.onInventoryChanged?.()
  }, [encounterContext])

  const getLootUsage = useCallback((
    sourceItemKey: string,
    sourceItemKind: EquipmentLootSourceKind,
    quantity: number,
  ) => {
    const row = lootState.find((stateRow) => (
      stateRow.sourceItemKey === sourceItemKey &&
      stateRow.sourceItemKind === sourceItemKind
    ))
    const spentQuantity = Math.max(0, Math.min(quantity, row?.spentQuantity ?? 0))
    return {
      spentQuantity,
      remainingQuantity: Math.max(0, quantity - spentQuantity),
    }
  }, [lootState])

  const handleSpendLootItem = useCallback(async (
    sourceItemKey: string,
    sourceItemKind: EquipmentLootSourceKind,
    quantity: number,
    delta: number,
  ) => {
    if (!encounterContext) return
    const current = lootStateRef.current.find((row) => (
      row.sourceItemKey === sourceItemKey &&
      row.sourceItemKind === sourceItemKind
    ))
    const spentQuantity = Math.max(0, Math.min(quantity, (current?.spentQuantity ?? 0) + delta))
    const nextRow: EncounterLootStateRow = {
      id: `encounter-loot-state-${encounterContext.encounterId}:${encounterContext.combatantId}:${sourceItemKind}:${sourceItemKey}`,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      sourceItemKey,
      sourceItemKind,
      spentQuantity,
      excluded: false,
      updatedAt: new Date().toISOString(),
    }
    const nextState = [...lootStateRef.current.filter((row) => !(
      row.sourceItemKey === sourceItemKey &&
      row.sourceItemKind === sourceItemKind
    )), nextRow]
    lootStateRef.current = nextState
    setLootState(nextState)
    await setEncounterLootItemState(
      encounterContext.encounterId,
      encounterContext.combatantId,
      sourceItemKey,
      sourceItemKind,
      spentQuantity,
      false,
    ).catch(logError('set-loot-item-state'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const removedIds = useMemo(
    () => new Set(
      overrides.filter((o) => o.isRemoved).map((o) => o.itemFoundryId ?? o.itemName)
    ),
    [overrides],
  )
  const addedItems = useMemo(
    () => overrides.filter((o) => !o.isRemoved),
    [overrides],
  )
  const addedCustomItems = useMemo(
    () => customOverrides.filter((o) => !o.isRemoved && o.id.includes(':added-custom:')),
    [customOverrides],
  )
  const removedCustomItemIds = useMemo(
    () => new Set(
      customOverrides.filter((o) => o.isRemoved).map((o) => o.customItemId)
    ),
    [customOverrides],
  )
  const visibleBase = useMemo(
    () => items.filter((item) => {
      const key = item.foundry_item_id ?? item.item_name
      return !removedIds.has(key)
    }),
    [items, removedIds],
  )
  const totalCount = visibleBase.length + addedItems.length + addedCustomItems.length

  return {
    overrides,
    customOverrides,
    addQuery,
    setAddQuery,
    addResults,
    customAddResults,
    drawerItemId,
    setDrawerItemId,
    handleRemove,
    handleRestoreBase,
    handleAddItem,
    handleAddCustomItem,
    handleRemoveAdded,
    handleRemoveBaseCustom,
    handleRestoreBaseCustom,
    handleRemoveAddedCustom,
    removedIds,
    removedCustomItemIds,
    addedItems,
    addedCustomItems,
    visibleBase,
    totalCount,
    getLootUsage,
    handleSpendLootItem,
  }
}
