import { useCombatantStore } from '@/entities/combatant'
import { useConditionStore, endTurnConditions, clearCombatantManager, hydrateManager, type ActiveCondition } from '@/entities/condition'
import { useCombatTrackerStore } from '../model/store'
import type { ConditionSlug } from '@engine'
import { toast } from 'sonner'

interface TurnSnapshot {
  activeCombatantId: string | null
  round: number
  turn: number
  conditionsBefore: ActiveCondition[]
  combatantId: string
}

let lastSnapshot: TurnSnapshot | null = null

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
    }

    // FEAT-11: reset MAP (multiple attack penalty) when the turn ends.
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

  let nextIdx: number
  let newRound = tracker.round
  let newTurn = tracker.turn + 1

  if (currentIdx === -1 || currentIdx >= combatants.length - 1) {
    nextIdx = 0
    newRound = tracker.round + 1
    newTurn = 0
  } else {
    nextIdx = currentIdx + 1
  }

  const nextCombatant = combatants[nextIdx]
  tracker.setActiveCombatant(nextCombatant.id)
  tracker.setRound(newRound)
  tracker.setTurn(newTurn)

  // PF2e: recovery check happens at START of the dying creature's turn (not when downed).
  const nextConditions = useConditionStore.getState().activeConditions
    .filter((c) => c.combatantId === nextCombatant.id)
  const dyingValue = nextConditions.find((c) => c.slug === 'dying')?.value ?? 0
  if (dyingValue > 0) {
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

  toast('Reversed to previous turn')

  lastSnapshot = null
}

export function canReverseTurn(): boolean {
  return lastSnapshot !== null
}

export function clearTurnSnapshot(): void {
  lastSnapshot = null
}
