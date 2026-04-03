import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface PendingPersistentDamage {
  combatantId: string
  combatantName: string
  conditions: { slug: string; formula: string; damageType: string }[]
}

export interface CombatTrackerState {
  combatId: string | null
  activeCombatantId: string | null
  round: number
  turn: number
  isRunning: boolean
  isEncounterBacked: boolean
  pendingPersistentDamage: PendingPersistentDamage | null
  startCombat: (combatId: string) => void
  endCombat: () => void
  startEncounterCombat: (
    encounterId: string,
    round: number,
    turn: number,
    activeCombatantId: string | null
  ) => void
  setActiveCombatant: (id: string | null) => void
  setRound: (round: number) => void
  setTurn: (turn: number) => void
  setCombatId: (id: string | null) => void
  setPendingPersistentDamage: (p: PendingPersistentDamage | null) => void
  restoreState: (s: {
    combatId: string | null
    activeCombatantId: string | null
    round: number
    turn: number
    isRunning: boolean
    isEncounterBacked: boolean
  }) => void
}

export const useCombatTrackerStore = create<CombatTrackerState>()(
  immer((set) => ({
    combatId: null,
    activeCombatantId: null,
    round: 0,
    turn: 0,
    isRunning: false,
    isEncounterBacked: false,
    pendingPersistentDamage: null,
    startCombat: (combatId) =>
      set((state) => {
        state.combatId = combatId
        state.round = 1
        state.turn = 0
        state.isRunning = true
      }),
    endCombat: () =>
      set((state) => {
        state.combatId = null
        state.activeCombatantId = null
        state.round = 0
        state.turn = 0
        state.isRunning = false
        state.isEncounterBacked = false
      }),
    startEncounterCombat: (encounterId, round, turn, activeCombatantId) =>
      set((state) => {
        state.combatId = encounterId
        state.round = round > 0 ? round : 1
        state.turn = turn
        state.activeCombatantId = activeCombatantId
        state.isRunning = true
        state.isEncounterBacked = true
      }),
    setActiveCombatant: (id) =>
      set((state) => {
        state.activeCombatantId = id
      }),
    setRound: (round) =>
      set((state) => {
        state.round = round
      }),
    setTurn: (turn) =>
      set((state) => {
        state.turn = turn
      }),
    setCombatId: (id) =>
      set((state) => {
        state.combatId = id
      }),
    setPendingPersistentDamage: (p) =>
      set((state) => {
        state.pendingPersistentDamage = p
      }),
    restoreState: (s) =>
      set((state) => {
        state.combatId = s.combatId
        state.activeCombatantId = s.activeCombatantId
        state.round = s.round
        state.turn = s.turn
        state.isRunning = s.isRunning
        state.isEncounterBacked = s.isEncounterBacked
        state.pendingPersistentDamage = null
      }),
  }))
)
