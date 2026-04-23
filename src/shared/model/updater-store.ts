import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { UpdateInfo, ProgressEvent } from '@/shared/api'

interface UpdaterState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error' | 'uptodate'
  update: UpdateInfo | null
  progress: { received: number; total: number | null } | null
  error: string | null
  toastShown: boolean

  setChecking: () => void
  setAvailable: (update: UpdateInfo) => void
  setDownloading: (progress: ProgressEvent) => void
  setInstalling: () => void
  setUpToDate: () => void
  setError: (message: string) => void
  reset: () => void
  markToastShown: () => void
}

export const useUpdaterStore = create<UpdaterState>()(immer((set) => ({
  status: 'idle',
  update: null,
  progress: null,
  error: null,
  toastShown: false,

  setChecking: () =>
    set((state) => {
      state.status = 'checking'
      state.error = null
    }),
  setAvailable: (update) =>
    set((state) => {
      state.status = 'available'
      state.update = update
      state.error = null
    }),
  setDownloading: (progress) =>
    set((state) => {
      state.status = 'downloading'
      state.progress = progress
    }),
  setInstalling: () =>
    set((state) => {
      state.status = 'installing'
    }),
  setUpToDate: () =>
    set((state) => {
      state.status = 'uptodate'
      state.update = null
      state.error = null
    }),
  setError: (message) =>
    set((state) => {
      state.status = 'error'
      state.error = message
    }),
  reset: () =>
    set((state) => {
      state.status = 'idle'
      state.update = null
      state.progress = null
      state.error = null
      // NB: toastShown intentionally NOT reset — session-scoped
    }),
  markToastShown: () =>
    set((state) => {
      state.toastShown = true
    }),
})))
