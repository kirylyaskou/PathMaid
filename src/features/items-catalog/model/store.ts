import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type SortField = 'level' | 'price' | null
type SortDir = 'asc' | 'desc'

interface ItemsCatalogState {
  // Filters
  query: string
  selectedType: string | null
  minLevel: string
  maxLevel: string
  selectedRarity: string | null
  selectedTraits: string[]
  selectedSource: string | null
  selectedSubcategory: string | null
  // Sort
  sortField: SortField
  sortDir: SortDir
  // Actions
  setQuery: (q: string) => void
  setSelectedType: (t: string | null) => void
  setMinLevel: (v: string) => void
  setMaxLevel: (v: string) => void
  setSelectedRarity: (r: string | null) => void
  toggleTrait: (trait: string) => void
  setSelectedSource: (s: string | null) => void
  setSelectedSubcategory: (s: string | null) => void
  toggleSort: (field: 'level' | 'price') => void
  clearFilters: () => void
  hasActiveFilters: () => boolean
}

export const useItemsCatalogStore = create<ItemsCatalogState>()(
  immer((set, get) => ({
    query: '',
    selectedType: null,
    minLevel: '',
    maxLevel: '',
    selectedRarity: null,
    selectedTraits: [],
    selectedSource: null,
    selectedSubcategory: null,
    sortField: null,
    sortDir: 'asc',

    setQuery: (q) => set((s) => { s.query = q }),
    setSelectedType: (t) => set((s) => {
      s.selectedType = t
      s.selectedSubcategory = null
    }),
    setMinLevel: (v) => set((s) => { s.minLevel = v }),
    setMaxLevel: (v) => set((s) => { s.maxLevel = v }),
    setSelectedRarity: (r) => set((s) => { s.selectedRarity = r }),
    toggleTrait: (trait) => set((s) => {
      const idx = s.selectedTraits.indexOf(trait)
      if (idx >= 0) s.selectedTraits.splice(idx, 1)
      else s.selectedTraits.push(trait)
    }),
    setSelectedSource: (src) => set((s) => { s.selectedSource = src }),
    setSelectedSubcategory: (sub) => set((s) => { s.selectedSubcategory = sub }),
    toggleSort: (field) => set((s) => {
      if (s.sortField === field) {
        if (s.sortDir === 'asc') {
          s.sortDir = 'desc'
        } else {
          s.sortField = null
          s.sortDir = 'asc'
        }
      } else {
        s.sortField = field
        s.sortDir = 'asc'
      }
    }),
    clearFilters: () => set((s) => {
      s.query = ''
      s.selectedType = null
      s.minLevel = ''
      s.maxLevel = ''
      s.selectedRarity = null
      s.selectedTraits = []
      s.selectedSource = null
      s.selectedSubcategory = null
    }),
    hasActiveFilters: () => {
      const s = get()
      return !!(
        s.query ||
        s.selectedType ||
        s.minLevel ||
        s.maxLevel ||
        s.selectedRarity ||
        s.selectedTraits.length > 0 ||
        s.selectedSource ||
        s.selectedSubcategory
      )
    },
  }))
)
