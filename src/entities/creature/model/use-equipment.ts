import { useState, useEffect, useCallback } from 'react'
import {
  loadItemOverrides,
  upsertItemOverride,
  deleteItemOverride,
  searchItems,
} from '@/shared/api'
import type { CreatureItemRow, EncounterItemRow, ItemRow } from '@/shared/api'
import { logError } from '@/shared/lib/error'

interface EncounterContext {
  encounterId: string
  combatantId: string
  onInventoryChanged?: () => void
}

export function useEquipment(
  items: CreatureItemRow[],
  encounterContext?: EncounterContext,
) {
  const [overrides, setOverrides] = useState<EncounterItemRow[]>([])
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<ItemRow[]>([])
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!encounterContext) return
    loadItemOverrides(encounterContext.encounterId, encounterContext.combatantId)
      .then(setOverrides)
      .catch(logError('load-item-overrides'))
  }, [encounterContext?.encounterId, encounterContext?.combatantId])

  useEffect(() => {
    if (!encounterContext || !addQuery.trim()) { setAddResults([]); return }
    const timer = setTimeout(() => {
      searchItems(addQuery).then((r) => setAddResults(r.slice(0, 8))).catch(logError('search-items'))
    }, 200)
    return () => clearTimeout(timer)
  }, [addQuery, encounterContext])

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
      damageFormula: catalogItem.damage_formula,
      acBonus: catalogItem.ac_bonus,
      isRemoved: false,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    setAddQuery('')
    setAddResults([])
    await upsertItemOverride(override).catch(logError('upsert-item-override'))
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleRemoveAdded = useCallback(async (override: EncounterItemRow) => {
    setOverrides((prev) => prev.filter((o) => o.id !== override.id))
    await deleteItemOverride(override.id).catch(logError('delete-item-override'))
    encounterContext?.onInventoryChanged?.()
  }, [encounterContext])

  // Derived
  const removedIds = new Set(
    overrides.filter((o) => o.isRemoved).map((o) => o.itemFoundryId ?? o.itemName)
  )
  const addedItems = overrides.filter((o) => !o.isRemoved)
  const visibleBase = items.filter((item) => {
    const key = item.foundry_item_id ?? item.item_name
    return !removedIds.has(key)
  })
  const totalCount = visibleBase.length + addedItems.length

  return {
    overrides,
    addQuery,
    setAddQuery,
    addResults,
    drawerItemId,
    setDrawerItemId,
    handleRemove,
    handleRestoreBase,
    handleAddItem,
    handleRemoveAdded,
    removedIds,
    addedItems,
    visibleBase,
    totalCount,
  }
}
