import { useEffect, useMemo, useState } from 'react'
import {
  getCustomItemsByIds,
  loadEncounterCustomItemRefs,
  type CustomItemRow,
} from '@/shared/api'
import {
  getCustomItemAbilityDeltas,
  getCustomItemFlatModifiers,
  getCustomItemGrantedAbilities,
  getCustomItemGrantedSpells,
  getCustomItemResistances,
  parseCustomItemRules,
  type SpellEffectModifierInput,
} from '@engine'
import { applyAbilityModDelta } from '../lib/apply-ability-mod-delta'
import type { CreatureStatBlockData } from './types'

interface EncounterContextLike {
  encounterId: string
  combatantId: string
}

const EMPTY_CUSTOM_REFS = [] as const

function mergeResistances(
  base: CreatureStatBlockData['resistances'],
  overlays: { type: string; value: number }[],
): CreatureStatBlockData['resistances'] {
  const byType = new Map(base.map((entry) => [entry.type, entry]))
  for (const overlay of overlays) {
    const current = byType.get(overlay.type)
    if (!current || overlay.value > current.value) {
      byType.set(overlay.type, { type: overlay.type, value: overlay.value })
    }
  }
  return Array.from(byType.values())
}

function applyCustomItemAbilityDeltas(
  creature: CreatureStatBlockData,
  customItems: CustomItemRow[],
): CreatureStatBlockData {
  let next = creature
  for (const item of customItems) {
    const rules = parseCustomItemRules(item.rules_json)
    for (const delta of getCustomItemAbilityDeltas(rules)) {
      next = applyAbilityModDelta(next, delta.ability, (next.abilityMods[delta.ability] ?? 0) + delta.value)
    }
  }
  return next
}

function grantedSpellSlots(
  rank: number,
  frequency: ReturnType<typeof getCustomItemGrantedSpells>[number]['frequency'],
): number {
  if (rank === 0 || frequency?.kind === 'at-will') return 0
  if (frequency?.kind === 'per') return frequency.max
  return 1
}

function buildGrantedSpellcasting(
  creature: CreatureStatBlockData,
  customItems: CustomItemRow[],
): CreatureStatBlockData['spellcasting'] {
  const sections = [...(creature.spellcasting ?? [])]
  for (const item of customItems) {
    const rules = parseCustomItemRules(item.rules_json)
    for (const spell of getCustomItemGrantedSpells(rules)) {
      const spellDc = spell.spellDc ?? creature.spellDC ?? 0
      sections.push({
        entryId: `custom-item:${item.id}:spell:${spell.name}:${spell.rank}`,
        entryName: `${item.name}: ${spell.name}`,
        tradition: spell.tradition,
        castType: spell.castType,
        spellDc,
        spellAttack: spell.spellAttack ?? (spellDc > 0 ? spellDc - 10 : 0),
        spellsByRank: [{
          rank: spell.rank,
          slots: grantedSpellSlots(spell.rank, spell.frequency),
          spells: [{
            name: spell.name,
            foundryId: spell.foundryId,
            entryId: `custom-item:${item.id}:spell:${spell.name}:${spell.rank}`,
            frequency: spell.frequency,
          }],
        }],
      })
    }
  }
  return sections
}

export function useCustomItemOverlays(
  creature: CreatureStatBlockData,
  encounterContext: EncounterContextLike | undefined,
  inventoryVersion: number,
): {
  creature: CreatureStatBlockData
  flatModifiers: SpellEffectModifierInput[]
  resistanceOverlays: { type: string; value: number }[]
} {
  const [encounterCustomItems, setEncounterCustomItems] = useState<CustomItemRow[]>([])
  const [baseCustomItems, setBaseCustomItems] = useState<CustomItemRow[]>([])
  const [removedCustomIds, setRemovedCustomIds] = useState<Set<string>>(new Set())

  const baseRefs = creature.customItemRefs ?? EMPTY_CUSTOM_REFS
  const baseIds = useMemo(
    () => Array.from(new Set(baseRefs.map((ref) => ref.customItemId))),
    [baseRefs],
  )

  useEffect(() => {
    if (baseIds.length === 0) {
      setBaseCustomItems([])
      return
    }
    let cancelled = false
    void getCustomItemsByIds(baseIds)
      .then((rows) => {
        if (!cancelled) setBaseCustomItems(rows)
      })
      .catch(() => {
        if (!cancelled) setBaseCustomItems([])
      })
    return () => {
      cancelled = true
    }
  }, [baseIds])

  useEffect(() => {
    if (!encounterContext) {
      setEncounterCustomItems([])
      setRemovedCustomIds(new Set())
      return
    }
    let cancelled = false
    void (async () => {
      const refs = await loadEncounterCustomItemRefs(
        encounterContext.encounterId,
        encounterContext.combatantId,
      )
      const removed = new Set(refs.filter((ref) => ref.isRemoved).map((ref) => ref.customItemId))
      const activeIds = refs
        .filter((ref) => !ref.isRemoved)
        .map((ref) => ref.customItemId)
      const rows = await getCustomItemsByIds(Array.from(new Set(activeIds)))
      const activeRows = rows.filter((row) => !removed.has(row.id))
      if (!cancelled) {
        setRemovedCustomIds(removed)
        setEncounterCustomItems(activeRows)
      }
    })().catch(() => {
      if (!cancelled) setEncounterCustomItems([])
    })
    return () => {
      cancelled = true
    }
  }, [encounterContext?.combatantId, encounterContext?.encounterId, inventoryVersion])

  const activeCustomItems = useMemo(() => {
    const byId = new Map<string, CustomItemRow>()
    for (const item of baseCustomItems) {
      if (!removedCustomIds.has(item.id)) byId.set(item.id, item)
    }
    for (const item of encounterCustomItems) byId.set(item.id, item)
    return Array.from(byId.values())
  }, [baseCustomItems, encounterCustomItems, removedCustomIds])

  return useMemo(() => {
    const flatModifiers: SpellEffectModifierInput[] = []
    const resistanceOverlays: { type: string; value: number }[] = []
    const grantedAbilities: CreatureStatBlockData['abilities'] = []

    for (const item of activeCustomItems) {
      const rules = parseCustomItemRules(item.rules_json)
      flatModifiers.push(...getCustomItemFlatModifiers(rules, item.id, item.name))
      resistanceOverlays.push(...getCustomItemResistances(rules))
      grantedAbilities.push(
        ...getCustomItemGrantedAbilities(rules).map((ability) => ({
          id: `custom-item:${item.id}:${ability.name}`,
          name: ability.name,
          actionCost: ability.actionCost,
          description: ability.description,
          traits: ability.traits,
        })),
      )
    }

    const withAbilityDeltas = applyCustomItemAbilityDeltas(creature, activeCustomItems)
    const withResistances = {
      ...withAbilityDeltas,
      resistances: mergeResistances(withAbilityDeltas.resistances, resistanceOverlays),
      abilities: [...withAbilityDeltas.abilities, ...grantedAbilities],
      spellcasting: buildGrantedSpellcasting(withAbilityDeltas, activeCustomItems),
    }

    return { creature: withResistances, flatModifiers, resistanceOverlays }
  }, [activeCustomItems, creature])
}
