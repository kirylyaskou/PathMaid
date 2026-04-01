import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface BestiaryFilters {
  levelMin: number | null
  levelMax: number | null
  traits: string[]
  rarity: string | null
  source: string | null
}

export interface BestiaryState {
  searchQuery: string
  filters: BestiaryFilters
  selectedCreatureId: string | null
  setSearchQuery: (query: string) => void
  setFilter: <K extends keyof BestiaryFilters>(key: K, value: BestiaryFilters[K]) => void
  setSelectedCreatureId: (id: string | null) => void
  resetFilters: () => void
}

const defaultFilters: BestiaryFilters = {
  levelMin: null,
  levelMax: null,
  traits: [],
  rarity: null,
  source: null,
}

export const useBestiaryStore = create<BestiaryState>()(
  immer((set) => ({
    searchQuery: '',
    filters: { ...defaultFilters },
    selectedCreatureId: null,
    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query
      }),
    setFilter: (key, value) =>
      set((state) => {
        state.filters = { ...state.filters, [key]: value }
      }),
    setSelectedCreatureId: (id) =>
      set((state) => {
        state.selectedCreatureId = id
      }),
    resetFilters: () =>
      set((state) => {
        state.filters = { ...defaultFilters }
      }),
  }))
)
