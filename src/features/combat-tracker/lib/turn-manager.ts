import { isNpc, useCombatantStore, type Combatant } from '@/entities/combatant'
import { useConditionStore, endTurnConditions, clearCombatantManager, hydrateManager, type ActiveCondition } from '@/entities/condition'
import { useEffectStore } from '@/entities/spell-effect'
import type { ActiveEffect } from '@/entities/spell-effect'
import { decrementEffectTurns as decrementEffectTurnsApi } from '@/shared/api'
import { useCombatTrackerStore } from '../model/store'
import type { ConditionSlug } from '@engine'
import { toast } from 'sonner'

interface TurnSnapshot {
  activeCombatantId: string | null
  round: number
  turn: number
  conditionsBefore: ActiveCondition[]
  combatantId: string
  effectsBefore: ActiveEffect[]
}

let lastSnapshot: TurnSnapshot | null = null

function shouldSkipTurn(combatant: Combatant): boolean {
  return isNpc(combatant) && combatant.mortal === true && combatant.hp <= 0
}

function getNextTurn(
  combatants: Combatant[],
  currentIdx: number,
  currentRound: number,
  currentTurn: number,
): { combatant: Combatant; round: number; turn: number } | null {
  let nextIdx = currentIdx
  let round = currentRound
  let turn = currentTurn

  for (let checked = 0; checked < combatants.length; checked++) {
    if (nextIdx === -1 || nextIdx >= combatants.length - 1) {
      nextIdx = 0
      round += 1
      turn = 0
    } else {
      nextIdx += 1
      turn += 1
    }

    const combatant = combatants[nextIdx]
    if (!shouldSkipTurn(combatant)) {
      return { combatant, round, turn }
    }
  }

  return null
}

export function advanceTurn(): void {
  const combatants = useCombatantStore.getState().combatants
  const tracker = useCombatTrackerStore.getState()

  if (!tracker.isRunning || combatants.length === 0) return

  const currentIdx = combatants.findIndex((c) => c.id === tracker.activeCombatantId)
  const endingCombatantId = tracker.activeCombatantId

  if (endingCombatantId) {
    lastSnapshot = {
      activeCombatantId: tracker.activeCombatantId,
      round: tracker.round,
      turn: tracker.turn,
      conditionsBefore: useConditionStore
        .getState()
        .activeConditions.filter((c) => c.combatantId === endingCombatantId),
      combatantId: endingCombatantId,
      effectsBefore: useEffectStore
        .getState()
        .activeEffects.filter((e) => e.combatantId === endingCombatantId),
    }

    // reset MAP (multiple attack penalty) when the turn ends.
    useCombatantStore.getState().updateCombatant(endingCombatantId, { mapIndex: 0 })

    const changes = endTurnConditions(endingCombatantId)
    if (changes.length > 0) {
      const summary = changes
        .map((c) => {
          const name = c.slug.replace('-', ' ')
          if (c.to === null) return `${name} removed`
          return `${name} ${c.from} → ${c.to}`
        })
        .join(', ')
      const combatant = combatants.find((cb) => cb.id === endingCombatantId)
      toast(`${combatant?.displayName ?? 'Combatant'}: ${summary}`)
    }

    // ── Spell Effect auto-decrement ────────────────────────────────────
    const encounterId = tracker.combatId
    if (encounterId && endingCombatantId) {
      const removed = useEffectStore.getState().decrementTurns(endingCombatantId)
      decrementEffectTurnsApi(encounterId, endingCombatantId).catch(() => {
        // DB sync failure is non-fatal — effects still tracked in store
      })
      if (removed.length > 0) {
        const combatant = combatants.find((cb) => cb.id === endingCombatantId)
        const names = removed.map((r) => r.effectName).join(', ')
        toast(`${combatant?.displayName ?? 'Combatant'}: ${names} expired`)
      }
    }

    // Persistent damage flat-checks — set pending state for dialog
    const persistentConditions = useConditionStore
      .getState()
      .activeConditions.filter(
        (c) => c.combatantId === endingCombatantId && c.slug.startsWith('persistent-')
      )
    if (persistentConditions.length > 0) {
      const combatant = combatants.find((cb) => cb.id === endingCombatantId)
      const name = combatant?.displayName ?? 'Combatant'
      tracker.setPendingPersistentDamage({
        combatantId: endingCombatantId!,
        combatantName: name,
        dealDamage: true,
        conditions: persistentConditions.map((pc) => ({
          slug: pc.slug,
          formula: pc.formula || '?',
          damageType: pc.slug.replace('persistent-', ''),
        })),
      })
    }
  }

  const nextTurn = getNextTurn(combatants, currentIdx, tracker.round, tracker.turn)
  if (!nextTurn) return

  const nextCombatant = nextTurn.combatant
  tracker.setActiveCombatant(nextCombatant.id)
  tracker.setRound(nextTurn.round)
  tracker.setTurn(nextTurn.turn)

  // PF2e: recovery check happens at START of the dying creature's turn (not when downed).
  const nextConditions = useConditionStore.getState().activeConditions
    .filter((c) => c.combatantId === nextCombatant.id)
  const dyingValue = nextConditions.find((c) => c.slug === 'dying')?.value ?? 0
  const doomedValue = nextConditions.find((c) => c.slug === 'doomed')?.value ?? 0
  const deathThreshold = 4 - doomedValue
  if (dyingValue > 0 && dyingValue < deathThreshold) {
    tracker.setPendingRecoveryCheck({
      combatantId: nextCombatant.id,
      combatantName: nextCombatant.displayName,
    })
  }
}

export function reverseTurn(): void {
  if (!lastSnapshot) return

  const tracker = useCombatTrackerStore.getState()
  if (!tracker.isRunning) return

  tracker.setActiveCombatant(lastSnapshot.activeCombatantId)
  tracker.setRound(lastSnapshot.round)
  tracker.setTurn(lastSnapshot.turn)

  const { combatantId, conditionsBefore } = lastSnapshot

  const engineConditions = conditionsBefore.filter((c) => !c.slug.startsWith('persistent-'))
  const persistentConditions = conditionsBefore.filter((c) => c.slug.startsWith('persistent-'))

  const conditionsForHydrate = engineConditions.map((c) => ({
    slug: c.slug as ConditionSlug,
    value: c.value ?? 1,
    isLocked: !!c.isLocked,
    grantedBy: c.grantedBy as ConditionSlug | undefined,
  }))

  clearCombatantManager(combatantId)
  hydrateManager(combatantId, conditionsForHydrate)
  // Restore persistent conditions directly (preserves formula)
  for (const pc of persistentConditions) {
    useConditionStore.getState().setCondition(pc)
  }

  // Restore spell effects to pre-turn state
  useEffectStore.getState().setEffectsForCombatant(
    combatantId,
    lastSnapshot.effectsBefore,
    { preserveCustom: false },
  )

  toast('Reversed to previous turn')

  lastSnapshot = null
}

export function canReverseTurn(): boolean {
  return lastSnapshot !== null
}

export function clearTurnSnapshot(): void {
  lastSnapshot = null
}
