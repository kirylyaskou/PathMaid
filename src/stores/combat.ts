import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import type { Creature } from '@/types/combat'
import { ConditionManager, type ConditionSlug } from '@/lib/pf2e'
import type { WeakEliteTier } from '@/types/entity'
import type { EntityResult } from '@/lib/entity-query'
import { getHpAdjustment } from '@/lib/weak-elite'
import { parseIwrData } from '@/lib/iwr-utils'
import { v4 as uuidv4 } from 'uuid'

export const useCombatStore = defineStore('combat', () => {
  const creatures = ref<Creature[]>([])
  const isActive = ref(false)

  const roundNumber = ref(1)
  const regenerationDisabled = ref<Record<string, boolean>>({})
  const actedCreatureIds = ref<Set<string>>(new Set())
  const persistentDamagePrompts = ref<Set<string>>(new Set())

  function showPersistentPrompt(creatureId: string): void {
    persistentDamagePrompts.value = new Set([...persistentDamagePrompts.value, creatureId])
  }

  function dismissPersistentPrompt(creatureId: string): void {
    const next = new Set(persistentDamagePrompts.value)
    next.delete(creatureId)
    persistentDamagePrompts.value = next
  }

  function recoverPersistentDamage(creatureId: string): void {
    const creature = creatures.value.find(c => c.id === creatureId)
    if (!creature) return
    mutateCondition(creature, cm => cm.remove('persistent-damage'))
    creature.persistentDamageFormula = undefined
    dismissPersistentPrompt(creatureId)
  }

  function setPersistentFormula(creatureId: string, formula: string): void {
    const creature = creatures.value.find(c => c.id === creatureId)
    if (!creature) return
    creature.persistentDamageFormula = formula
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mutateCondition(creature: any, fn: (cm: ConditionManager) => void): void {
    fn(creature.conditionManager as ConditionManager)
    creature.conditionVersion++
  }

  const sortedCreatures = computed(() => {
    return [...creatures.value].sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative
      }
      return (b.dexMod || 0) - (a.dexMod || 0)
    })
  })

  const currentTurnCreature = computed(() => {
    const sorted = sortedCreatures.value
    return sorted.find(c => c.isCurrentTurn) || null
  })

  const hasAllActed = computed(() => {
    if (creatures.value.length === 0) return false
    return creatures.value.every(c => actedCreatureIds.value.has(c.id))
  })

  function addCreature(creature: Omit<Creature, 'id' | 'conditionManager' | 'conditionVersion' | 'isCurrentTurn' | 'isDowned'>): void {
    const newCreature: Creature = {
      ...creature,
      id: uuidv4(),
      isCurrentTurn: false,
      isDowned: creature.currentHP <= 0,
      conditionManager: markRaw(new ConditionManager()) as ConditionManager,
      conditionVersion: 0,
    }
    creatures.value.push(newCreature)
  }

  function modifyHP(id: string, delta: number): void {
    const creature = creatures.value.find(c => c.id === id)
    if (creature) {
      creature.currentHP = Math.max(0, creature.currentHP + delta)
      creature.isDowned = creature.currentHP <= 0
    }
  }

  type ConditionWithOptions = {
    condition: ConditionSlug
    duration?: number
    protected: boolean
  }

  function toggleCondition(id: string, slug: ConditionSlug): void {
    const creature = creatures.value.find(c => c.id === id)
    if (!creature) return
    mutateCondition(creature, cm => {
      if (cm.has(slug)) {
        cm.remove(slug)
      } else {
        cm.add(slug)
      }
    })
  }

  function toggleConditionWithOptions(
    creatureId: string,
    conditionWithOptions: ConditionWithOptions
  ): void {
    const creature = creatures.value.find(c => c.id === creatureId)
    if (!creature) return
    const { condition: slug, duration, protected: isProtected } = conditionWithOptions
    const cm = creature.conditionManager

    if (cm.has(slug)) {
      cm.remove(slug)
    } else {
      cm.add(slug)
      if (duration !== undefined && duration > 0) {
        cm.setDuration(slug, duration)
      }
      if (isProtected) {
        cm.setProtected(slug, true)
      }
    }
    creature.conditionVersion++
  }

  function endCreatureTurn(creatureId: string): void {
    const creature = creatures.value.find(c => c.id === creatureId)
    if (!creature) return
    mutateCondition(creature, cm => cm.endTurn())
  }

  function applyTurnEffects(creatureId: string): void {
    const creature = creatures.value.find(c => c.id === creatureId)
    if (!creature) return

    // Check regeneration disabled toggle - skip all effects if disabled per CONTEXT.md
    if (regenerationDisabled.value[creatureId]) {
      return
    }

    // Apply healing/regen: positive delta capped at maxHP by computing remaining headroom
    const regenAmount = creature.regenAmount || 0
    if (regenAmount > 0) {
      const headroom = creature.maxHP - creature.currentHP
      const actualHeal = Math.min(regenAmount, headroom)
      if (actualHeal > 0) {
        modifyHP(creatureId, actualHeal)
      }
    }

    // Apply ongoing damage: negative delta, clamped at 0 by modifyHP
    const ongoingDamage = creature.ongoingDamage || 0
    if (ongoingDamage > 0) {
      modifyHP(creatureId, -ongoingDamage)
    }
  }

  function advanceRound(): void {
    // Clear all persistent damage prompts at round boundary
    persistentDamagePrompts.value = new Set()

    // Increment round number per CONTEXT.md
    roundNumber.value++

    // Reset all creatures to !isCurrentTurn
    creatures.value.forEach(creature => {
      creature.isCurrentTurn = false
    })

    // Clear acted tracking for new round
    actedCreatureIds.value = new Set()

    // Clear regeneration disabled toggle per CONTEXT.md ("must re-enable each round")
    regenerationDisabled.value = {}

    // Set first sorted creature as current for new round
    const sorted = sortedCreatures.value
    if (sorted.length > 0) {
      sorted[0].isCurrentTurn = true
      endCreatureTurn(sorted[0].id)
      applyTurnEffects(sorted[0].id)
      // Show persistent prompt for first creature of new round if it has persistent-damage
      if (sorted[0].conditionManager.has('persistent-damage')) {
        showPersistentPrompt(sorted[0].id)
      }
    }
  }

  function nextCreature(): void {
    const sorted = sortedCreatures.value

    if (sorted.length === 0) return

    const currentIndex = sorted.findIndex(c => c.isCurrentTurn)

    if (currentIndex === -1) {
      // No current turn set, set first sorted creature
      sorted[0].isCurrentTurn = true
      endCreatureTurn(sorted[0].id)
      applyTurnEffects(sorted[0].id)
      return
    }

    // Mark current creature as having acted
    const currentCreature = sorted[currentIndex]
    actedCreatureIds.value = new Set([...actedCreatureIds.value, currentCreature.id])
    currentCreature.isCurrentTurn = false

    // Dismiss any existing persistent prompt, then re-show if creature still has persistent-damage
    dismissPersistentPrompt(currentCreature.id)
    if (currentCreature.conditionManager.has('persistent-damage')) {
      showPersistentPrompt(currentCreature.id)
    }

    // Check if this was the last creature in sorted order
    if (currentIndex === sorted.length - 1) {
      // All creatures have gone — leave no creature as current
      // hasAllActed will now return true, enabling New Round
      return
    }

    // Advance to next sorted creature
    const nextCreatureObj = sorted[currentIndex + 1]
    nextCreatureObj.isCurrentTurn = true
    endCreatureTurn(nextCreatureObj.id)
    applyTurnEffects(nextCreatureObj.id)
  }

  function reorderCreature(sourceId: string, targetId: string): void {
    if (sourceId === targetId) return
    const source = creatures.value.find(c => c.id === sourceId)
    const target = creatures.value.find(c => c.id === targetId)
    if (!source || !target) return
    // Swap initiative values so sortedCreatures recomputes order
    const tempInit = source.initiative
    source.initiative = target.initiative
    target.initiative = tempInit
    // If initiatives are equal, also swap dexMod to ensure order change
    if (source.initiative === target.initiative) {
      const tempDex = source.dexMod
      source.dexMod = target.dexMod
      target.dexMod = tempDex
    }
  }

  function toggleRegenerationDisabled(creatureId: string): void {
    if (regenerationDisabled.value[creatureId]) {
      // Disable toggle (turn regeneration back ON)
      delete regenerationDisabled.value[creatureId]
    } else {
      // Enable toggle (turn regeneration OFF)
      regenerationDisabled.value[creatureId] = true
    }
  }

  function setCurrentTurn(index: number): void {
    const previous = creatures.value.find(c => c.isCurrentTurn)
    const sorted = sortedCreatures.value
    const current = sorted[index]

    // Clear previous creature's turn
    if (previous) {
      previous.isCurrentTurn = false
    }

    // Set new current creature
    if (current) {
      current.isCurrentTurn = true

      // Apply turn effects per CONTEXT.md timing:
      // 1. First: decrement duration conditions (skip protected)
      // 2. Then: apply healing/regen/ongoing damage
      endCreatureTurn(current.id)
      applyTurnEffects(current.id)
    }
  }

  function setConditionValue(id: string, slug: ConditionSlug, value: number): void {
    const creature = creatures.value.find(c => c.id === id)
    if (!creature) return
    mutateCondition(creature, cm => {
      if (value <= 0) {
        cm.remove(slug)
      } else {
        cm.add(slug, value)
      }
    })
  }

  function getConditionValue(id: string, slug: ConditionSlug): number {
    const creature = creatures.value.find(c => c.id === id)
    return creature?.conditionManager.get(slug) ?? 1
  }

  function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function nextNumberFor(baseName: string): number {
    const pattern = new RegExp(`^(?:Elite: |Weak: )?${escapeRegex(baseName)}(?: (\\d+))?$`)
    let max = 0
    for (const c of creatures.value) {
      const m = c.name.match(pattern)
      if (m) {
        max = Math.max(max, m[1] ? parseInt(m[1], 10) : 1)
      }
    }
    return max + 1
  }

  function buildNames(baseName: string, qty: number, tier: WeakEliteTier): string[] {
    const prefix = tier === 'normal' ? '' : tier === 'elite' ? 'Elite: ' : 'Weak: '
    const existingCount = creatures.value.filter(c => {
      const pattern = new RegExp(`^(?:Elite: |Weak: )?${escapeRegex(baseName)}(?: \\d+)?$`)
      return pattern.test(c.name)
    }).length
    const needsNumbers = qty > 1 || existingCount > 0

    if (!needsNumbers) {
      return [`${prefix}${baseName}`]
    }

    const startNum = nextNumberFor(baseName)
    return Array.from({ length: qty }, (_, i) => `${prefix}${baseName} ${startNum + i}`)
  }

  function addFromBrowser(entity: EntityResult, qty: number, tier: WeakEliteTier): void {
    const raw = JSON.parse(entity.rawData)
    const baseMaxHP: number = raw?.system?.attributes?.hp?.max ?? 0
    const ac: number = raw?.system?.attributes?.ac?.value ?? 10
    const level: number = entity.level ?? 0
    const dexMod: number = raw?.system?.abilities?.dex?.mod ?? 0
    const iwrData = parseIwrData(raw)

    const hpDelta = getHpAdjustment(tier, level)
    const adjustedMaxHP = Math.max(1, baseMaxHP + hpDelta)

    const names = buildNames(entity.name, qty, tier)

    for (const name of names) {
      addCreature({
        name,
        maxHP: adjustedMaxHP,
        currentHP: adjustedMaxHP,
        ac,
        initiative: 0,
        dexMod,
        sourceId: entity.slug,
        tier,
        level,
        iwrData,
      })
    }
  }

  return {
    creatures,
    isActive,
    roundNumber,
    regenerationDisabled,
    actedCreatureIds,
    persistentDamagePrompts,
    sortedCreatures,
    currentTurnCreature,
    hasAllActed,
    addCreature,
    modifyHP,
    toggleCondition,
    toggleConditionWithOptions,
    endCreatureTurn,
    applyTurnEffects,
    advanceRound,
    nextCreature,
    reorderCreature,
    toggleRegenerationDisabled,
    setCurrentTurn,
    setConditionValue,
    getConditionValue,
    addFromBrowser,
    showPersistentPrompt,
    dismissPersistentPrompt,
    recoverPersistentDamage,
    setPersistentFormula,
  }
})
