import { useCallback } from 'react'
import { rollDice } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'

/**
 * Returns a stable callback that rolls a formula and pushes the result to
 * the shared roll history. Optionally tags the roll with a source name and
 * combat encounter id.
 */
export function useRoll(source?: string, combatId?: string) {
  const addRoll = useRollStore((s) => s.addRoll)
  return useCallback(
    (formula: string, label?: string) => {
      addRoll(rollDice(formula, label, { source, combatId }))
    },
    [addRoll, source, combatId],
  )
}
