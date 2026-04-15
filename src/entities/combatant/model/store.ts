import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Combatant, CombatantPatch, StagingCombatant } from './types'

export interface CombatantState {
  combatants: Combatant[]
  addCombatant: (combatant: Combatant) => void
  removeCombatant: (id: string) => void
  updateHp: (id: string, delta: number) => void
  updateTempHp: (id: string, tempHp: number) => void
  setMaxHp: (id: string, newMaxHp: number) => void
  updateCombatant: (id: string, patch: CombatantPatch) => void
  setInitiative: (id: string, initiative: number) => void
  reorderInitiative: (orderedIds: string[]) => void
  setCombatants: (combatants: Combatant[]) => void
  clearAll: () => void
  // ── Staging pool ──────────────────────────────────────────────────────────
  stagingCombatants: StagingCombatant[]
  addStagingCombatant: (combatant: Combatant, round?: number) => void
  removeStagingCombatant: (id: string) => void
  setStagingCombatants: (staging: StagingCombatant[]) => void
  releaseFromStaging: (id: string) => Combatant | undefined
  reorderStaging: (orderedIds: string[]) => void
}

export const useCombatantStore = create<CombatantState>()(
  immer((set) => ({
    combatants: [],
    addCombatant: (combatant) =>
      set((state) => {
        state.combatants.push(combatant)
      }),
    removeCombatant: (id) =>
      set((state) => {
        state.combatants = state.combatants.filter((c) => c.id !== id)
      }),
    updateHp: (id, delta) =>
      set((state) => {
        const c = state.combatants.find((c) => c.id === id)
        if (c) c.hp = Math.max(0, Math.min(c.maxHp, c.hp + delta))
      }),
    updateTempHp: (id, tempHp) =>
      set((state) => {
        const c = state.combatants.find((c) => c.id === id)
        if (c) c.tempHp = Math.max(0, tempHp)
      }),
    setMaxHp: (id, newMaxHp) =>
      set((state) => {
        const c = state.combatants.find((c) => c.id === id)
        if (!c) return
        const clamped = Math.max(1, newMaxHp)
        c.maxHp = clamped
        // Clamp current HP so it never exceeds the (possibly reduced) maximum.
        if (c.hp > clamped) c.hp = clamped
      }),
    updateCombatant: (id, patch) =>
      set((state) => {
        const c = state.combatants.find((c) => c.id === id)
        if (!c) return
        Object.assign(c, patch)
      }),
    setInitiative: (id, initiative) =>
      set((state) => {
        const c = state.combatants.find((c) => c.id === id)
        if (c) c.initiative = initiative
      }),
    reorderInitiative: (orderedIds) =>
      set((state) => {
        state.combatants.sort(
          (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
        )
      }),
    setCombatants: (combatants) =>
      set((state) => {
        state.combatants = combatants
      }),
    clearAll: () =>
      set((state) => {
        state.combatants = []
        state.stagingCombatants = []
      }),
    // ── Staging pool ──────────────────────────────────────────────────────────
    stagingCombatants: [],
    addStagingCombatant: (combatant, round) =>
      set((state) => {
        state.stagingCombatants.push({
          combatant,
          round,
          sortOrder: state.stagingCombatants.length,
        })
      }),
    removeStagingCombatant: (id) =>
      set((state) => {
        state.stagingCombatants = state.stagingCombatants.filter(
          (s) => s.combatant.id !== id
        )
      }),
    setStagingCombatants: (staging) =>
      set((state) => {
        state.stagingCombatants = staging
      }),
    releaseFromStaging: (id) => {
      let released: Combatant | undefined
      set((state) => {
        const idx = state.stagingCombatants.findIndex((s) => s.combatant.id === id)
        if (idx === -1) return
        released = { ...state.stagingCombatants[idx].combatant, initiative: 0 }
        state.stagingCombatants.splice(idx, 1)
        state.combatants.push(released)
      })
      return released
    },
    reorderStaging: (orderedIds) =>
      set((state) => {
        state.stagingCombatants.sort(
          (a, b) => orderedIds.indexOf(a.combatant.id) - orderedIds.indexOf(b.combatant.id)
        )
        state.stagingCombatants.forEach((s, i) => {
          s.sortOrder = i
        })
      }),
  }))
)
