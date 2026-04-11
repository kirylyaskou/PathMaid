import { useState, useRef, useCallback, useEffect } from 'react'
import { useCombatantStore } from '@/entities/combatant'
import { fetchCreatureStatBlockData } from '@/entities/creature'
import type { CreatureStatBlockData } from '@/entities/creature'
import { getCharacterById, loadItemOverrides } from '@/shared/api'
import { useCombatTrackerStore } from '@/features/combat-tracker'
import { isShieldItem } from '@/shared/lib/equipment'
import type { PathbuilderBuild } from '@engine'

const LRU_MAX = 10

function evictIfFull<T>(cache: Map<string, T>): void {
  if (cache.size >= LRU_MAX) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
}

/** Encapsulates NPC stat block + PC build loading with LRU caches and shield detection. */
export function useCombatDetailLoader() {
  const [lastNpcStatBlock, setLastNpcStatBlock] = useState<CreatureStatBlockData | null>(null)
  const [statBlockLoading, setStatBlockLoading] = useState(false)
  const [selectedPcBuild, setSelectedPcBuild] = useState<PathbuilderBuild | null>(null)
  const [pcBuildLoading, setPcBuildLoading] = useState(false)

  const statBlockCache = useRef<Map<string, CreatureStatBlockData>>(new Map())
  const pcBuildCache = useRef<Map<string, PathbuilderBuild>>(new Map())
  const abortRef = useRef<AbortController | null>(null)

  // Cancel any in-flight load on unmount.
  useEffect(() => () => abortRef.current?.abort(), [])

  /** Detect + apply shield AC bonus for an NPC combatant from cached data or encounter inventory. */
  const applyShieldBonus = useCallback(async (combatantId: string, data: CreatureStatBlockData) => {
    let shieldAcBonus: number | null = null
    const baseShield = data.equipment?.find((it) => isShieldItem(it.item_type, it.item_name ?? ''))
    if (baseShield) {
      shieldAcBonus = baseShield.ac_bonus ?? 0
    } else {
      const { combatId: cid, isEncounterBacked: enc } = useCombatTrackerStore.getState()
      if (enc && cid) {
        const encItems = await loadItemOverrides(cid, combatantId).catch(() => [])
        const encShield = encItems.find((it) => !it.isRemoved && isShieldItem(it.itemType, it.itemName))
        if (encShield) shieldAcBonus = encShield.acBonus ?? 0
      }
    }
    useCombatantStore.getState().updateCombatant(combatantId, { shieldAcBonus })
  }, [])

  /** Re-detect shield bonus after encounter inventory changes (called from onInventoryChanged). */
  const refreshShieldBonus = useCallback(async (combatantId: string, combatId: string) => {
    const creatureRef =
      useCombatantStore.getState().combatants.find((c) => c.id === combatantId)?.creatureRef ?? ''
    const cached = statBlockCache.current.get(creatureRef)
    const baseShield = cached?.equipment?.find((it) => isShieldItem(it.item_type, it.item_name ?? ''))
    if (baseShield) {
      useCombatantStore.getState().updateCombatant(combatantId, { shieldAcBonus: baseShield.ac_bonus ?? 0 })
      return
    }
    const encItems = await loadItemOverrides(combatId, combatantId).catch(() => [])
    const encShield = encItems.find((it) => !it.isRemoved && isShieldItem(it.itemType, it.itemName))
    useCombatantStore.getState().updateCombatant(combatantId, {
      shieldAcBonus: encShield ? (encShield.acBonus ?? 0) : null,
    })
  }, [])

  /** Load detail for the selected combatant. Handles NPC, PC, and hazard branches.
   *  Cancels any previous in-flight request so rapid selection changes never
   *  apply a stale result over a newer one. */
  const loadForCombatant = useCallback(async (id: string) => {
    // Cancel previous in-flight request and start a new one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const combatant = useCombatantStore.getState().combatants.find((c) => c.id === id)
    if (!combatant) return

    // NPC branch — load creature stat block
    if (combatant.kind === 'npc' && combatant.creatureRef) {
      setSelectedPcBuild(null)
      const cached = statBlockCache.current.get(combatant.creatureRef)
      if (cached) {
        if (controller.signal.aborted) return
        setLastNpcStatBlock(cached)
        // Re-apply shield bonus when unset (e.g. after encounter reload).
        if (combatant.shieldAcBonus === undefined) {
          await applyShieldBonus(id, cached)
        }
        return
      }
      setStatBlockLoading(true)
      try {
        const data = await fetchCreatureStatBlockData(combatant.creatureRef)
        if (controller.signal.aborted) return
        if (data) {
          evictIfFull(statBlockCache.current)
          statBlockCache.current.set(combatant.creatureRef, data)
          setLastNpcStatBlock(data)
          await applyShieldBonus(id, data)
        }
      } finally {
        if (!controller.signal.aborted) setStatBlockLoading(false)
      }
      return
    }

    // PC branch — load PathbuilderBuild
    if (combatant.kind === 'pc' && combatant.creatureRef) {
      setLastNpcStatBlock(null)
      const cached = pcBuildCache.current.get(combatant.creatureRef)
      if (cached) {
        if (controller.signal.aborted) return
        setSelectedPcBuild(cached)
        return
      }
      setPcBuildLoading(true)
      try {
        const character = await getCharacterById(combatant.creatureRef)
        if (controller.signal.aborted) return
        if (character) {
          const build = JSON.parse(character.rawJson) as PathbuilderBuild
          evictIfFull(pcBuildCache.current)
          pcBuildCache.current.set(combatant.creatureRef, build)
          setSelectedPcBuild(build)
        }
      } catch {
        // rawJson parse failure — leave selectedPcBuild null
      } finally {
        if (!controller.signal.aborted) setPcBuildLoading(false)
      }
      return
    }

    // Hazard branch — leave right panel sticky (no update)
  }, [applyShieldBonus])

  return {
    lastNpcStatBlock,
    statBlockLoading,
    selectedPcBuild,
    pcBuildLoading,
    loadForCombatant,
    refreshShieldBonus,
  }
}
