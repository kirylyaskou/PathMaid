import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  createEncounterLootEntry,
  deleteEncounterLootEntry,
  getEncounterLootSettings,
  listEncounterLootEntries,
  listEncounterLootState,
  loadEncounterLootSources,
  saveEncounterLootSettings,
  setEncounterLootItemState,
  upsertEncounterLootEntry,
} from '@/shared/api'
import { groupEncounterLootItems, resolveEncounterLoot } from '../lib/resolve-loot'
import { formatEncounterLootTelegram } from '../lib/telegram-format'
import type {
  EncounterLootEntry,
  EncounterLootGroup,
  EncounterLootSourceKind,
  EncounterLootState,
  ResolvedEncounterLoot,
  ResolvedEncounterLootItem,
} from '../lib/types'

interface EncounterLootSourcesState {
  combatants: Awaited<ReturnType<typeof loadEncounterLootSources>>['combatants']
  baseItems: Awaited<ReturnType<typeof loadEncounterLootSources>>['baseItems']
  itemOverrides: Awaited<ReturnType<typeof loadEncounterLootSources>>['itemOverrides']
  customItems: Awaited<ReturnType<typeof loadEncounterLootSources>>['customItems']
}

export interface EncounterLootEntryPatch {
  itemId?: string | null
  name?: string
  itemType?: string | null
  quantity?: number
  priceGp?: number | null
  bulk?: string | null
  notes?: string | null
}

const EMPTY_SOURCES: EncounterLootSourcesState = {
  combatants: [],
  baseItems: [],
  itemOverrides: [],
  customItems: [],
}

const EMPTY_LOOT: ResolvedEncounterLoot = {
  items: [],
  summary: { totalGp: 0, totalBulk: 0 },
}

function findItemState(
  state: EncounterLootState[],
  item: ResolvedEncounterLootItem,
): EncounterLootState | undefined {
  return state.find((row) => (
    row.combatantId === item.combatantId &&
    row.sourceItemKind === item.sourceItemKind &&
    row.sourceItemKey === item.sourceItemKey
  ))
}

function normalizeQuantity(quantity: number): number {
  return Math.max(1, Math.floor(quantity) || 1)
}

export function useEncounterLoot(encounterId: string | null) {
  const [autoFromEnemies, setAutoFromEnemies] = useState(true)
  const [sources, setSources] = useState<EncounterLootSourcesState>(EMPTY_SOURCES)
  const [additionalEntries, setAdditionalEntries] = useState<EncounterLootEntry[]>([])
  const [state, setState] = useState<EncounterLootState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!encounterId) return
    setLoading(true)
    setError(null)
    try {
      const [settings, loadedSources, entries, runtimeState] = await Promise.all([
        getEncounterLootSettings(encounterId),
        loadEncounterLootSources(encounterId),
        listEncounterLootEntries(encounterId),
        listEncounterLootState(encounterId),
      ])
      setAutoFromEnemies(settings.autoFromEnemies)
      setSources(loadedSources)
      setAdditionalEntries(entries)
      setState(runtimeState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load encounter loot')
    } finally {
      setLoading(false)
    }
  }, [encounterId])

  useEffect(() => {
    void reload()
  }, [reload])

  const resolved = useMemo<ResolvedEncounterLoot>(() => {
    if (!encounterId) return EMPTY_LOOT
    return resolveEncounterLoot({
      settings: { encounterId, autoFromEnemies },
      combatants: sources.combatants,
      baseItems: sources.baseItems,
      itemOverrides: sources.itemOverrides,
      customItems: sources.customItems,
      additionalEntries,
      state,
    })
  }, [additionalEntries, autoFromEnemies, encounterId, sources, state])

  const groups = useMemo<EncounterLootGroup[]>(
    () => groupEncounterLootItems(resolved.items),
    [resolved.items],
  )

  const saveAutoFromEnemies = useCallback(async (enabled: boolean) => {
    if (!encounterId) return
    setAutoFromEnemies(enabled)
    setSaving(true)
    try {
      await saveEncounterLootSettings(encounterId, enabled)
    } catch (err) {
      setAutoFromEnemies((current) => !current)
      toast.error(err instanceof Error ? err.message : 'Failed to save loot settings')
    } finally {
      setSaving(false)
    }
  }, [encounterId])

  const addAdditionalEntry = useCallback(async (patch: EncounterLootEntryPatch) => {
    if (!encounterId || !patch.name?.trim()) return
    setSaving(true)
    try {
      await createEncounterLootEntry({
        encounterId,
        itemId: patch.itemId ?? null,
        name: patch.name.trim(),
        itemType: patch.itemType ?? null,
        quantity: normalizeQuantity(patch.quantity ?? 1),
        priceGp: patch.priceGp ?? null,
        bulk: patch.bulk ?? null,
        notes: patch.notes ?? null,
        sortOrder: additionalEntries.length,
      })
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add loot')
    } finally {
      setSaving(false)
    }
  }, [additionalEntries.length, encounterId, reload])

  const updateAdditionalEntry = useCallback(async (
    entry: EncounterLootEntry,
    patch: EncounterLootEntryPatch,
  ) => {
    const updatedEntry = {
      ...entry,
      ...patch,
      name: patch.name?.trim() || entry.name,
      quantity: normalizeQuantity(patch.quantity ?? entry.quantity),
    }
    setAdditionalEntries((prev) => prev.map((row) => row.id === entry.id ? updatedEntry : row))
    setSaving(true)
    try {
      await upsertEncounterLootEntry(updatedEntry)
    } catch (err) {
      setAdditionalEntries((prev) => prev.map((row) => row.id === entry.id ? entry : row))
      toast.error(err instanceof Error ? err.message : 'Failed to update loot')
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteAdditionalEntry = useCallback(async (entryId: string) => {
    setSaving(true)
    try {
      await deleteEncounterLootEntry(entryId)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete loot')
    } finally {
      setSaving(false)
    }
  }, [reload])

  const setItemState = useCallback(async (
    item: ResolvedEncounterLootItem,
    spentQuantity: number,
    excluded: boolean,
  ) => {
    if (!encounterId) return
    setSaving(true)
    try {
      await setEncounterLootItemState(
        encounterId,
        item.combatantId,
        item.sourceItemKey,
        item.sourceItemKind as EncounterLootSourceKind,
        Math.max(0, Math.min(item.quantity, Math.floor(spentQuantity) || 0)),
        excluded,
      )
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update item state')
    } finally {
      setSaving(false)
    }
  }, [encounterId, reload])

  const spendItem = useCallback(async (item: ResolvedEncounterLootItem, delta: number) => {
    const currentState = findItemState(state, item)
    const spentQuantity = Math.max(0, Math.min(item.quantity, (currentState?.spentQuantity ?? item.spentQuantity) + delta))
    await setItemState(item, spentQuantity, currentState?.excluded ?? false)
  }, [setItemState, state])

  const excludeItem = useCallback(async (item: ResolvedEncounterLootItem, excluded: boolean) => {
    const currentState = findItemState(state, item)
    await setItemState(item, currentState?.spentQuantity ?? item.spentQuantity, excluded)
  }, [setItemState, state])

  const copyTelegramText = useCallback(async () => {
    await navigator.clipboard.writeText(formatEncounterLootTelegram(resolved))
    toast('Loot copied')
  }, [resolved])

  return {
    autoFromEnemies,
    additionalEntries,
    copyTelegramText,
    deleteAdditionalEntry,
    error,
    excludeItem,
    groups,
    loading,
    reload,
    resolved,
    saveAutoFromEnemies,
    saving,
    spendItem,
    addAdditionalEntry,
    updateAdditionalEntry,
  }
}
