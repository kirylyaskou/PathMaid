import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface CombatTrackerState {
  // Session runtime state only — NOT persisted to SQLite
  activeCombatantId: string | null
  round: number
  turn: number
  isRunning: boolean
  startCombat: () => void
  endCombat: () => void
  nextTurn: () => void
  setActiveCombatant: (id: string | null) => void
}

export const useCombatTrackerStore = create<CombatTrackerState>()(
  immer((set) => ({
    activeCombatantId: null,
    round: 0,
    turn: 0,
    isRunning: false,
    startCombat: () =>
      set((state) => {
        state.round = 1
        state.turn = 0
        state.isRunning = true
      }),
    endCombat: () =>
      set((state) => {
        state.activeCombatantId = null
        state.round = 0
        state.turn = 0
        state.isRunning = false
      }),
    nextTurn: () =>
      set((state) => {
        state.turn += 1
      }),
    setActiveCombatant: (id) =>
      set((state) => {
        state.activeCombatantId = id
      }),
  }))
)
