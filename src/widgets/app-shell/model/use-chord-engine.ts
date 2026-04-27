import { useEffect, useRef } from 'react'
import { useHotkeyStore, parseChord } from '@/shared/model/hotkey-store'
import { advanceTurn } from '@/features/combat-tracker/lib/turn-manager'

/** Milliseconds to wait for the chord suffix key before timing out */
const CHORD_TIMEOUT_MS = 1500

/** Min/max zoom expressed as a fraction (0.7 = 70%, 1.5 = 150%) */
const ZOOM_MIN = 0.7
const ZOOM_MAX = 1.5
const ZOOM_STEP = 0.1

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

/**
 * Builds a canonical modifier+key string from a KeyboardEvent.
 * Format mirrors the chord combo stored in DB: "Ctrl+F", "Shift+Alt+G", etc.
 */
function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  // Normalise single-char keys to uppercase to match DB format
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(key)
  return parts.join('+')
}

/**
 * Builds a suffix string from a KeyboardEvent (for the second chord key).
 * Suffix keys are typically bare digits/letters, but can carry modifiers.
 */
function eventToSuffix(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(key)
  return parts.join('+')
}

/**
 * Global chord hotkey state machine.
 * State: idle → awaiting-suffix (timeout 1500 ms) → execute → idle
 *
 * Mount once in AppShell via `useChordEngine()` (void, pure side effects).
 */
export function useChordEngine(): void {
  const hotkeys = useHotkeyStore((s) => s.hotkeys)
  const cursorMode = useHotkeyStore((s) => s.cursorMode)
  const setCursorMode = useHotkeyStore((s) => s.setCursorMode)
  const resetCursorMode = useHotkeyStore((s) => s.resetCursorMode)
  const setPendingCombo = useHotkeyStore((s) => s.setPendingCombo)
  const zoomLevel = useHotkeyStore((s) => s.zoomLevel)
  const setZoomLevel = useHotkeyStore((s) => s.setZoomLevel)

  /**
   * pendingComboRef holds the in-flight combo prefix while awaiting the suffix
   * key. Ref (not state) because we need synchronous read inside the same
   * event handler and don't want a stale closure.
   */
  const pendingComboRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep a ref to latest store values so the event handler doesn't go stale.
  const hotkeysRef = useRef(hotkeys)
  const cursorModeRef = useRef(cursorMode)
  const zoomLevelRef = useRef(zoomLevel)

  useEffect(() => { hotkeysRef.current = hotkeys }, [hotkeys])
  useEffect(() => { cursorModeRef.current = cursorMode }, [cursorMode])
  useEffect(() => { zoomLevelRef.current = zoomLevel }, [zoomLevel])

  useEffect(() => {
    function clearPending() {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      pendingComboRef.current = null
      setPendingCombo(null)
    }

    function executeAction(action: string) {
      if (action === 'next-initiative') {
        advanceTurn()
        return
      }

      if (action === 'zoom-in') {
        const next = Math.min(ZOOM_MAX, parseFloat((zoomLevelRef.current + ZOOM_STEP).toFixed(2)))
        setZoomLevel(next)
        document.documentElement.style.zoom = String(next)
        return
      }

      if (action === 'zoom-out') {
        const next = Math.max(ZOOM_MIN, parseFloat((zoomLevelRef.current - ZOOM_STEP).toFixed(2)))
        setZoomLevel(next)
        document.documentElement.style.zoom = String(next)
        return
      }

      // apply-condition:<slug>:<value>
      if (action.startsWith('apply-condition:')) {
        // action format: "apply-condition:<conditionKey>:<value>"
        // Use lastIndexOf to split value from the rest
        const firstColon = 'apply-condition:'.length
        const lastColon = action.lastIndexOf(':')
        if (lastColon <= firstColon) return
        const conditionKey = action.slice(firstColon, lastColon)
        const value = parseInt(action.slice(lastColon + 1), 10)
        if (isNaN(value)) return

        // Find the hotkey id for this action to pass as payload
        const hk = hotkeysRef.current.find((h) => h.action === action)
        setCursorMode({
          type: 'apply-condition',
          conditionKey,
          value,
          hotkeyId: hk?.id ?? '',
        })
        return
      }
    }

    function onKeydown(e: KeyboardEvent) {
      // Escape resets everything regardless of state
      if (e.key === 'Escape') {
        clearPending()
        resetCursorMode()
        return
      }

      // Do not capture while cursor-mode is active (click handler owns it)
      if (cursorModeRef.current.type !== 'normal') return

      // Do not capture while an input element has focus
      if (isInputFocused()) return

      const currentCombo = pendingComboRef.current

      if (currentCombo === null) {
        // ── Idle state: check if this keydown matches any chord prefix ──
        const pressedCombo = eventToCombo(e)

        const matchingHotkeys = hotkeysRef.current.filter((hk) => {
          const parsed = parseChord(hk.chord)
          return parsed !== null && parsed.combo === pressedCombo
        })

        if (matchingHotkeys.length === 0) return

        e.preventDefault()
        pendingComboRef.current = pressedCombo
        setPendingCombo(pressedCombo)

        // Timeout: cancel awaiting-suffix after 1500 ms
        timeoutRef.current = setTimeout(() => {
          clearPending()
        }, CHORD_TIMEOUT_MS)
      } else {
        // ── Awaiting-suffix state: match the suffix key ──
        const pressedSuffix = eventToSuffix(e)

        const matched = hotkeysRef.current.find((hk) => {
          const parsed = parseChord(hk.chord)
          return parsed !== null && parsed.combo === currentCombo && parsed.suffix === pressedSuffix
        })

        e.preventDefault()
        clearPending()

        if (matched) {
          executeAction(matched.action)
        }
      }
    }

    document.addEventListener('keydown', onKeydown)
    return () => {
      document.removeEventListener('keydown', onKeydown)
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCursorMode, resetCursorMode, setPendingCombo, setZoomLevel])
}
