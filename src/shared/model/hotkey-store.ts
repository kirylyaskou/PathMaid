import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { listHotkeys, type Hotkey } from '@/shared/api/hotkeys'

export interface ParsedChord {
  /** Key combination before the last colon, e.g. "Ctrl+F" */
  combo: string
  /** Suffix after the last colon, e.g. "3" */
  suffix: string
}

/**
 * Parses DB chord format "Ctrl+F:3" — combo is everything before the last
 * colon, suffix is everything after. Returns null if the chord has no colon.
 */
export function parseChord(chord: string): ParsedChord | null {
  const idx = chord.lastIndexOf(':')
  if (idx === -1) return null
  return { combo: chord.slice(0, idx), suffix: chord.slice(idx + 1) }
}

export type CursorMode =
  | { type: 'normal' }
  | { type: 'apply-condition'; conditionKey: string; value: number; hotkeyId: string }

interface HotkeyStoreState {
  /** Hotkeys loaded from DB */
  hotkeys: Hotkey[]
  loadHotkeys: () => Promise<void>

  /** Cursor mode for apply-condition flow */
  cursorMode: CursorMode
  setCursorMode: (mode: CursorMode) => void
  resetCursorMode: () => void

  /** Chord pending UI state — which combo prefix is currently held */
  pendingCombo: string | null
  setPendingCombo: (combo: string | null) => void

  /** Zoom level — session only, not persisted */
  zoomLevel: number
  setZoomLevel: (level: number) => void
}

export const useHotkeyStore = create<HotkeyStoreState>()(
  immer((set) => ({
    hotkeys: [],
    loadHotkeys: async () => {
      const hotkeys = await listHotkeys()
      set((state) => {
        state.hotkeys = hotkeys
      })
    },

    cursorMode: { type: 'normal' },
    setCursorMode: (mode) =>
      set((state) => {
        state.cursorMode = mode
      }),
    resetCursorMode: () =>
      set((state) => {
        state.cursorMode = { type: 'normal' }
      }),

    pendingCombo: null,
    setPendingCombo: (combo) =>
      set((state) => {
        state.pendingCombo = combo
      }),

    zoomLevel: 1,
    setZoomLevel: (level) =>
      set((state) => {
        state.zoomLevel = level
      }),
  }))
)
