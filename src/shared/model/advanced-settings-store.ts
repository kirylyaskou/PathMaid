import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdvancedSettingsState {
  stagingPool: boolean
  customContent: boolean
  nonMortalCreatures: boolean
  /** Cloud auto-sync toggle. Sync only runs when true AND user is authenticated AND online. */
  autoSyncEnabled: boolean
  setStagingPool: (value: boolean) => void
  setCustomContent: (value: boolean) => void
  setNonMortalCreatures: (value: boolean) => void
  setAutoSyncEnabled: (value: boolean) => void
}

export const useAdvancedSettingsStore = create<AdvancedSettingsState>()(
  persist(
    (set) => ({
      stagingPool: true,
      customContent: true,
      nonMortalCreatures: false,
      autoSyncEnabled: true,
      setStagingPool: (value) => set({ stagingPool: value }),
      setCustomContent: (value) => set({ customContent: value }),
      setNonMortalCreatures: (value) => set({ nonMortalCreatures: value }),
      setAutoSyncEnabled: (value) => set({ autoSyncEnabled: value }),
    }),
    {
      name: 'pathmaid-advanced-settings',
    },
  ),
)
