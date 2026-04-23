// ─── BattleForm / CreatureSize overrides ─────────────────
// Session-only Zustand store mirroring the `useEffectStore` lifecycle. Keyed
// by combatant id; one size and/or one BattleForm override per combatant.
//
// Deviation from 65-CONTEXT.md: the context nominated `useCombatTrackerStore`
// as the host. That violates FSD layering — `entities/creature/ui/CreatureStatBlock`
// cannot import from `@/features/combat-tracker` (entities < features).
// Hosting the overrides here keeps the consumer in-layer (entities → entities),
// matches `useEffectStore` / `useRollOptionsStore` as other session-only stores
// added in this phase, and lets the combat-tracker clear them through a
// one-way dependency (features → entities) on combat-end.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CreatureSize, BattleFormStrikeOverride } from '@engine'

export interface BattleFormOverride {
  ac?: number
  strikes?: BattleFormStrikeOverride[]
  /** Source effect id (encounter_combatant_effects.id) — for targeted clearing. */
  sourceEffectId: string
}

export interface CreatureSizeOverride {
  size: CreatureSize
  sourceEffectId: string
}

export interface BattleFormOverridesState {
  creatureSizeOverrides: Record<string, CreatureSizeOverride>
  battleFormOverrides: Record<string, BattleFormOverride>
  setCreatureSizeOverride: (
    combatantId: string,
    size: CreatureSize,
    sourceEffectId: string,
  ) => void
  setBattleFormOverride: (combatantId: string, override: BattleFormOverride) => void
  clearBySourceEffect: (sourceEffectId: string) => void
  clearCombatant: (combatantId: string) => void
  clearAll: () => void
}

export const useBattleFormOverridesStore = create<BattleFormOverridesState>()(
  immer((set) => ({
    creatureSizeOverrides: {},
    battleFormOverrides: {},
    setCreatureSizeOverride: (combatantId, size, sourceEffectId) =>
      set((state) => {
        state.creatureSizeOverrides[combatantId] = { size, sourceEffectId }
      }),
    setBattleFormOverride: (combatantId, override) =>
      set((state) => {
        state.battleFormOverrides[combatantId] = { ...override }
      }),
    clearBySourceEffect: (sourceEffectId) =>
      set((state) => {
        for (const [cid, entry] of Object.entries(state.creatureSizeOverrides)) {
          if (entry.sourceEffectId === sourceEffectId) {
            delete state.creatureSizeOverrides[cid]
          }
        }
        for (const [cid, entry] of Object.entries(state.battleFormOverrides)) {
          if (entry.sourceEffectId === sourceEffectId) {
            delete state.battleFormOverrides[cid]
          }
        }
      }),
    clearCombatant: (combatantId) =>
      set((state) => {
        delete state.creatureSizeOverrides[combatantId]
        delete state.battleFormOverrides[combatantId]
      }),
    clearAll: () =>
      set((state) => {
        state.creatureSizeOverrides = {}
        state.battleFormOverrides = {}
      }),
  })),
)
