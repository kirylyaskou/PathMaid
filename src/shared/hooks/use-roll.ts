import { useCallback } from 'react'
import { rollDice } from '@engine'
import type { Roll, RollContext } from '@engine'
import { useRollStore } from '@/shared/model'

interface RollOptions {
  record?: boolean
}

/**
 * Low-level dice roller. The formula is already final: callers above
 * shared decide modifiers, combat context, fortune, and misfortune.
 */
export function useRoll(
  source?: string,
  combatId?: string,
  _combatantId?: string,
  _rollContext?: RollContext['type'],
) {
  const addRoll = useRollStore((s) => s.addRoll)
  return useCallback(
    (formula: string, label?: string, options?: RollOptions): Roll => {
      const roll = rollDice(formula, label, { source, combatId })
      if (options?.record !== false) {
        addRoll(roll)
      }
      return roll
    },
    [addRoll, source, combatId],
  )
}
