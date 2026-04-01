import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Creature } from './types'

export interface CreatureState {
  creatures: Creature[]
  selectedId: string | null
  setCreatures: (creatures: Creature[]) => void
  setSelectedId: (id: string | null) => void
  upsertCreature: (creature: Creature) => void
  clearAll: () => void
}

export const useCreatureStore = create<CreatureState>()(
  immer((set) => ({
    creatures: [],
    selectedId: null,
    setCreatures: (creatures) =>
      set((state) => {
        state.creatures = creatures
      }),
    setSelectedId: (id) =>
      set((state) => {
        state.selectedId = id
      }),
    upsertCreature: (creature) =>
      set((state) => {
        const idx = state.creatures.findIndex((c) => c.id === creature.id)
        if (idx >= 0) state.creatures[idx] = creature
        else state.creatures.push(creature)
      }),
    clearAll: () =>
      set((state) => {
        state.creatures = []
        state.selectedId = null
      }),
  }))
)
