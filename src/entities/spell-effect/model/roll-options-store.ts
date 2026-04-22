// ─── Roll-Option Store ────────────────────────────────────
// Module-level Zustand store mirroring the ConditionManager pattern. Session-only
// state — NOT persisted to SQLite. Used to track `RollOption` rule-element flags
// set by active effects (e.g. Sure Strike's "sure-strike" option) and consumed
// by matching `RollTwice`/`AdjustModifier` rules at roll time.
//
// Scope: flags keyed by `combatantId:optionSlug`. Each flag may carry a
// `consumed` bit — used for one-shot fortune semantics where the next
// matching roll clears the flag (e.g. Bit of Luck / Sure Strike after one
// attack). Clears on encounter reset; no DB round-trip.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface RollOptionEntry {
  /** Owning combatant (encounter_combatants.id). */
  combatantId: string
  /** Foundry `option` slug, e.g. "sure-strike", "bit-of-luck". */
  option: string
  /** Source effect id (encounter_combatant_effects.id) for lifecycle cleanup. */
  sourceEffectId: string
  /** Whether this option is a one-shot and has already been consumed. */
  consumed?: boolean
}

export interface RollOptionsState {
  options: RollOptionEntry[]
  setOption: (entry: RollOptionEntry) => void
  /** Mark one-shot option as used. Safe to call on non-one-shot entries (no-op). */
  markConsumed: (combatantId: string, option: string) => void
  hasActiveOption: (combatantId: string, option: string) => boolean
  clearBySourceEffect: (sourceEffectId: string) => void
  clearCombatant: (combatantId: string) => void
  clearAll: () => void
}

export const useRollOptionsStore = create<RollOptionsState>()(
  immer((set, get) => ({
    options: [],
    setOption: (entry) =>
      set((state) => {
        const idx = state.options.findIndex(
          (e) =>
            e.combatantId === entry.combatantId &&
            e.option === entry.option &&
            e.sourceEffectId === entry.sourceEffectId,
        )
        if (idx >= 0) {
          state.options[idx] = { ...entry }
        } else {
          state.options.push({ ...entry })
        }
      }),
    markConsumed: (combatantId, option) =>
      set((state) => {
        for (const e of state.options) {
          if (e.combatantId === combatantId && e.option === option) {
            e.consumed = true
          }
        }
      }),
    hasActiveOption: (combatantId, option) => {
      return get().options.some(
        (e) => e.combatantId === combatantId && e.option === option && !e.consumed,
      )
    },
    clearBySourceEffect: (sourceEffectId) =>
      set((state) => {
        state.options = state.options.filter((e) => e.sourceEffectId !== sourceEffectId)
      }),
    clearCombatant: (combatantId) =>
      set((state) => {
        state.options = state.options.filter((e) => e.combatantId !== combatantId)
      }),
    clearAll: () =>
      set((state) => {
        state.options = []
      }),
  })),
)
