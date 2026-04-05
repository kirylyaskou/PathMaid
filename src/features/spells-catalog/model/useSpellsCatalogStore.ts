import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface SpellsCatalogState {
  query: string
  selectedTradition: string | null
  selectedTrait: string | null
  selectedRank: number | null
  selectedActionCost: string | null
  activeTab: 'spells' | 'focus'
  setQuery: (q: string) => void
  setSelectedTradition: (t: string | null) => void
  setSelectedTrait: (t: string | null) => void
  setSelectedRank: (r: number | null) => void
  setSelectedActionCost: (a: string | null) => void
  setActiveTab: (tab: 'spells' | 'focus') => void
  clearFilters: () => void
  hasActiveFilters: () => boolean
}

export const useSpellsCatalogStore = create<SpellsCatalogState>()(
  immer((set, get) => ({
    query: '',
    selectedTradition: null,
    selectedTrait: null,
    selectedRank: null,
    selectedActionCost: null,
    activeTab: 'spells',

    setQuery: (q) => set((s) => { s.query = q }),
    setSelectedTradition: (t) => set((s) => { s.selectedTradition = t }),
    setSelectedTrait: (t) => set((s) => { s.selectedTrait = t }),
    setSelectedRank: (r) => set((s) => { s.selectedRank = r }),
    setSelectedActionCost: (a) => set((s) => { s.selectedActionCost = a }),
    setActiveTab: (tab) => set((s) => { s.activeTab = tab }),

    clearFilters: () => set((s) => {
      s.query = ''
      s.selectedTradition = null
      s.selectedTrait = null
      s.selectedRank = null
      s.selectedActionCost = null
    }),

    hasActiveFilters: () => {
      const s = get()
      return !!(s.query || s.selectedTradition || s.selectedTrait || s.selectedRank !== null || s.selectedActionCost)
    },
  }))
)
