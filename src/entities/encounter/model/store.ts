import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Encounter, EncounterCombatant } from './types'
import {
  listEncounters,
  createEncounter as apiCreateEncounter,
  deleteEncounter as apiDeleteEncounter,
} from '@/shared/api'

export interface EncounterState {
  encounters: Encounter[]
  selectedId: string | null
  setEncounters: (encounters: Encounter[]) => void
  setSelectedId: (id: string | null) => void
  upsertEncounter: (encounter: Encounter) => void
  removeEncounter: (id: string) => void
  clearAll: () => void
  /** Load all encounters from SQLite (combatants array starts empty; load per-encounter on select) */
  loadEncounters: () => Promise<void>
  /** Create a new named encounter in SQLite and add to store; selects it immediately */
  createNewEncounter: (name: string) => Promise<void>
  /** Delete encounter from SQLite and remove from store */
  deleteEncounterById: (id: string) => Promise<void>
  /** Set the combatants array on a specific encounter in store (after loading from DB) */
  setEncounterCombatants: (encounterId: string, combatants: EncounterCombatant[]) => void
}

export const useEncounterStore = create<EncounterState>()(
  immer((set) => ({
    encounters: [],
    selectedId: null,

    setEncounters: (encounters) =>
      set((state) => { state.encounters = encounters }),

    setSelectedId: (id) =>
      set((state) => { state.selectedId = id }),

    upsertEncounter: (encounter) =>
      set((state) => {
        const idx = state.encounters.findIndex((e) => e.id === encounter.id)
        if (idx >= 0) state.encounters[idx] = encounter
        else state.encounters.push(encounter)
      }),

    removeEncounter: (id) =>
      set((state) => {
        state.encounters = state.encounters.filter((e) => e.id !== id)
      }),

    clearAll: () =>
      set((state) => {
        state.encounters = []
        state.selectedId = null
      }),

    loadEncounters: async () => {
      const records = await listEncounters()
      set((state) => {
        state.encounters = records.map((r) => ({
          ...r,
          combatants: [],
        }))
      })
    },

    createNewEncounter: async (name: string) => {
      const id = crypto.randomUUID()
      await apiCreateEncounter(id, name, 1, 4)
      set((state) => {
        state.encounters.unshift({
          id,
          name,
          partyLevel: 1,
          partySize: 4,
          round: 0,
          turn: 0,
          activeCombatantId: null,
          isRunning: false,
          createdAt: new Date().toISOString(),
          combatants: [],
        })
        state.selectedId = id
      })
    },

    deleteEncounterById: async (id: string) => {
      await apiDeleteEncounter(id)
      set((state) => {
        state.encounters = state.encounters.filter((e) => e.id !== id)
        if (state.selectedId === id) state.selectedId = null
      })
    },

    setEncounterCombatants: (encounterId: string, combatants: EncounterCombatant[]) =>
      set((state) => {
        const enc = state.encounters.find((e) => e.id === encounterId)
        if (enc) enc.combatants = combatants
      }),
  }))
)
