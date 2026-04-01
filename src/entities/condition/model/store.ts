import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ActiveCondition } from './types'

export interface ConditionState {
  activeConditions: ActiveCondition[]
  setCondition: (condition: ActiveCondition) => void
  removeCondition: (combatantId: string, slug: string) => void
  decrementCondition: (combatantId: string, slug: string) => void
  clearCombatantConditions: (combatantId: string) => void
  setAllForCombatant: (combatantId: string, conditions: ActiveCondition[]) => void
  clearAll: () => void
}

export const useConditionStore = create<ConditionState>()(
  immer((set) => ({
    activeConditions: [],
    setCondition: (condition) =>
      set((state) => {
        const idx = state.activeConditions.findIndex(
          (c) => c.combatantId === condition.combatantId && c.slug === condition.slug
        )
        if (idx >= 0) state.activeConditions[idx] = condition
        else state.activeConditions.push(condition)
      }),
    removeCondition: (combatantId, slug) =>
      set((state) => {
        state.activeConditions = state.activeConditions.filter(
          (c) => !(c.combatantId === combatantId && c.slug === slug)
        )
      }),
    decrementCondition: (combatantId, slug) =>
      set((state) => {
        const c = state.activeConditions.find(
          (ac) => ac.combatantId === combatantId && ac.slug === slug
        )
        if (c && c.value !== undefined) {
          if (c.value <= 1) {
            state.activeConditions = state.activeConditions.filter(
              (ac) => !(ac.combatantId === combatantId && ac.slug === slug)
            )
          } else {
            c.value -= 1
          }
        }
      }),
    clearCombatantConditions: (combatantId) =>
      set((state) => {
        state.activeConditions = state.activeConditions.filter(
          (c) => c.combatantId !== combatantId
        )
      }),
    setAllForCombatant: (combatantId, conditions) =>
      set((state) => {
        state.activeConditions = state.activeConditions.filter(
          (c) => c.combatantId !== combatantId
        )
        state.activeConditions.push(...conditions)
      }),
    clearAll: () =>
      set((state) => {
        state.activeConditions = []
      }),
  }))
)
