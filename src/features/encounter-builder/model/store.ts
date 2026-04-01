import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface PartyConfig {
  partyLevel: number
  partySize: number
}

export interface EncounterBuilderState {
  // Session runtime state only — draft encounter before saving
  draftCreatureIds: string[]
  partyConfig: PartyConfig
  addCreatureToDraft: (creatureId: string) => void
  removeCreatureFromDraft: (creatureId: string) => void
  setPartyConfig: (config: Partial<PartyConfig>) => void
  clearDraft: () => void
}

export const useEncounterBuilderStore = create<EncounterBuilderState>()(
  immer((set) => ({
    draftCreatureIds: [],
    partyConfig: { partyLevel: 1, partySize: 4 },
    addCreatureToDraft: (creatureId) =>
      set((state) => {
        state.draftCreatureIds.push(creatureId)
      }),
    removeCreatureFromDraft: (creatureId) =>
      set((state) => {
        const idx = state.draftCreatureIds.lastIndexOf(creatureId)
        if (idx >= 0) state.draftCreatureIds.splice(idx, 1)
      }),
    setPartyConfig: (config) =>
      set((state) => {
        Object.assign(state.partyConfig, config)
      }),
    clearDraft: () =>
      set((state) => {
        state.draftCreatureIds = []
      }),
  }))
)
