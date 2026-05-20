import { useEffect, useRef } from 'react'
import { useHotkeyStore, parseChord } from '@/shared/model'
import { advanceTurn } from '@/features/combat-tracker'
import { useCombatantStore } from '@/entities/combatant'
import { useCreatureStore } from '@/entities/creature'
import { computeStealthVsParty } from '@/shared/lib/stealth-vs-party'

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

/** Keys that are pure modifiers — never appear as the non-modifier part of a combo */
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'])

/**
 * Normalise e.code → canonical key label used in stored hotkey combos.
 * Using e.code makes hotkeys layout-agnostic: Ctrl+S fires on any keyboard
 * language because e.code is always 'KeyS' regardless of the active layout.
 * Returns null for modifier-only codes (handled by isModifierOnly via e.key).
 */
function codeToKey(code: string): string | null {
  if (code.startsWith('Key')) return code.slice(3).toUpperCase()        // KeyS → S
  if (code.startsWith('Digit')) return code.slice(5)                    // Digit3 → 3
  if (code.startsWith('Numpad')) return code.slice(6)                   // Numpad3 → 3
  if (code.startsWith('F') && code.length <= 3) return code            // F1..F12
  const MAP: Record<string, string> = {
    Space: 'Space', Enter: 'Enter', Escape: 'Escape',
    Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete',
    Insert: 'Insert', Home: 'Home', End: 'End',
    PageUp: 'PageUp', PageDown: 'PageDown',
    ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Semicolon: ';', Quote: "'", Backquote: '`',
    Backslash: '\\', Comma: ',', Period: '.', Slash: '/',
    NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*',
    NumpadDivide: '/', NumpadDecimal: '.', NumpadEnter: 'Enter',
  }
  return MAP[code] ?? null
}

/** Returns true when the event carries only modifier keys and no actual key */
export function isModifierOnly(e: KeyboardEvent): boolean {
  return MODIFIER_KEYS.has(e.key)
}

/**
 * Builds a canonical modifier+key string from a KeyboardEvent.
 * Format mirrors the chord combo stored in DB: "Ctrl+F", "Shift+Alt+G", etc.
 * Uses e.code for the key part so combos are layout-agnostic (Ctrl+S works on
 * both EN and RU keyboard layouts). Falls back to e.key for keys not in codeToKey.
 * Returns null for modifier-only events.
 */
export function eventToCombo(e: KeyboardEvent): string | null {
  if (isModifierOnly(e)) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  const key = codeToKey(e.code) ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)
  return parts.join('+')
}

/**
 * Builds a suffix string from a KeyboardEvent (for the second chord key).
 * Suffix keys are typically bare digits/letters.
 * Uses e.code for layout-agnostic matching.
 * Returns null for modifier-only events.
 */
export function eventToSuffix(e: KeyboardEvent): string | null {
  if (isModifierOnly(e)) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  const key = codeToKey(e.code) ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
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
  const setStealthResult = useHotkeyStore((s) => s.setStealthResult)

  const combatants = useCombatantStore((s) => s.combatants)
  const creatures = useCreatureStore((s) => s.creatures)

  const combatantsRef = useRef(combatants)
  const creaturesRef = useRef(creatures)

  /**
   * pendingComboRef holds the in-flight combo prefix while awaiting the suffix
   * key. Ref (not state) because we need synchronous read inside the same
   * event handler and don't want a stale closure.
   */
  const pendingComboRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Holds conditionKey+hotkeyId while waiting for the value digit after an apply-condition combo */
  const pendingApplyRef = useRef<{ conditionKey: string; hotkeyId: string } | null>(null)

  // Keep a ref to latest store values so the event handler doesn't go stale.
  const hotkeysRef = useRef(hotkeys)
  const cursorModeRef = useRef(cursorMode)
  const zoomLevelRef = useRef(zoomLevel)

  useEffect(() => { hotkeysRef.current = hotkeys }, [hotkeys])
  useEffect(() => { cursorModeRef.current = cursorMode }, [cursorMode])
  useEffect(() => { zoomLevelRef.current = zoomLevel }, [zoomLevel])
  useEffect(() => { combatantsRef.current = combatants }, [combatants])
  useEffect(() => { creaturesRef.current = creatures }, [creatures])

  useEffect(() => {
    function clearPending() {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      pendingComboRef.current = null
      setPendingCombo(null)
    }

    function clearApplyPending() {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      pendingApplyRef.current = null
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

      if (action === 'stealth-vs-party') {
        const rows = computeStealthVsParty(combatantsRef.current, creaturesRef.current)
        setStealthResult(rows)
        return
      }
    }

    function onKeydown(e: KeyboardEvent) {
      // Escape resets everything regardless of state
      if (e.key === 'Escape') {
        clearPending()
        clearApplyPending()
        resetCursorMode()
        return
      }

      // Do not capture while cursor-mode is active (click handler owns it)
      if (cursorModeRef.current.type !== 'normal') return

      // Do not capture while an input element has focus
      if (isInputFocused()) return

      // ── Phase: awaiting digit for apply-condition ──
      if (pendingApplyRef.current !== null) {
        if (isModifierOnly(e)) return
        // Extract digit from raw key (ignore modifiers for value)
        const rawKey = e.key.length === 1 ? e.key : null
        const value = rawKey !== null ? parseInt(rawKey, 10) : NaN
        e.preventDefault()
        if (!isNaN(value) && value >= 1 && value <= 9) {
          const { conditionKey, hotkeyId } = pendingApplyRef.current
          setCursorMode({ type: 'apply-condition', conditionKey, value, hotkeyId })
        }
        clearApplyPending()
        clearPending()
        return
      }

      const currentCombo = pendingComboRef.current

      if (currentCombo === null) {
        // ── Idle state: check if this keydown matches any chord prefix ──
        const pressedCombo = eventToCombo(e)
        if (pressedCombo === null) return

        // apply-condition hotkeys store combo only (no :suffix in chord)
        const applyMatch = hotkeysRef.current.find((hk) =>
          hk.action.startsWith('apply-condition:') && hk.chord === pressedCombo
        )
        if (applyMatch) {
          e.preventDefault()
          const conditionKey = applyMatch.action.slice('apply-condition:'.length)
          pendingApplyRef.current = { conditionKey, hotkeyId: applyMatch.id }
          setPendingCombo(pressedCombo)
          timeoutRef.current = setTimeout(() => {
            clearApplyPending()
            clearPending()
          }, CHORD_TIMEOUT_MS)
          return
        }

        // Normal two-phase chord: combo + suffix stored as "Ctrl+F:1"
        const matchingHotkeys = hotkeysRef.current.filter((hk) => {
          if (hk.action.startsWith('apply-condition:')) return false
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
        if (pressedSuffix === null) return

        const matched = hotkeysRef.current.find((hk) => {
          if (hk.action.startsWith('apply-condition:')) return false
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
  }, [setCursorMode, resetCursorMode, setPendingCombo, setZoomLevel, setStealthResult])
}
