import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Roll } from '@engine'

interface RollStoreState {
  // Roll history
  rolls: Roll[]
  addRoll: (roll: Roll) => void
  clearRolls: () => void

  // MAP tracking (attack count per combatant per round)
  attackCountByCombatant: Record<string, number>
  incrementAttackCount: (combatantId: string) => void
  resetAttackCount: (combatantId: string) => void
  resetAllMAP: () => void
}

export const useRollStore = create<RollStoreState>()(
  immer((set) => ({
    rolls: [],
    addRoll: (roll) =>
      set((state) => {
        state.rolls.push(roll)
      }),
    clearRolls: () =>
      set((state) => {
        state.rolls = []
      }),

    attackCountByCombatant: {},
    incrementAttackCount: (combatantId) =>
      set((state) => {
        state.attackCountByCombatant[combatantId] =
          (state.attackCountByCombatant[combatantId] ?? 0) + 1
      }),
    resetAttackCount: (combatantId) =>
      set((state) => {
        delete state.attackCountByCombatant[combatantId]
      }),
    resetAllMAP: () =>
      set((state) => {
        state.attackCountByCombatant = {}
      }),
  }))
)
