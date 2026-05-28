import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdvancedSettingsState {
  stagingPool: boolean
  customContent: boolean
  nonMortalCreatures: boolean
  setStagingPool: (value: boolean) => void
  setCustomContent: (value: boolean) => void
  setNonMortalCreatures: (value: boolean) => void
}

export const useAdvancedSettingsStore = create<AdvancedSettingsState>()(
  persist(
    (set) => ({
      stagingPool: true,
      customContent: true,
      nonMortalCreatures: false,
      setStagingPool: (value) => set({ stagingPool: value }),
      setCustomContent: (value) => set({ customContent: value }),
      setNonMortalCreatures: (value) => set({ nonMortalCreatures: value }),
    }),
    {
      name: 'pathmaid-advanced-settings',
    },
  ),
)
