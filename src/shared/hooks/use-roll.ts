import { useCallback } from 'react'
import { rollDice } from '@engine'
import type { Roll } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'

/**
 * Returns a stable callback that rolls a formula, pushes the result to
 * the shared roll history, and returns the Roll for further inspection.
 * Optionally tags the roll with a source name and combat encounter id.
 */
export function useRoll(source?: string, combatId?: string) {
  const addRoll = useRollStore((s) => s.addRoll)
  return useCallback(
    (formula: string, label?: string): Roll => {
      const roll = rollDice(formula, label, { source, combatId })
      addRoll(roll)
      return roll
    },
    [addRoll, source, combatId],
  )
}
