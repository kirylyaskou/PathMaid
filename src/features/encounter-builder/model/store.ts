import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  calculateXP,
  generateEncounterBudgets,
  getAdjustedLevel,
  type EncounterResult,
  type ThreatRating,
  type WeakEliteTier,
  type HazardType,
} from '@engine'
import { loadPartyConfig, savePartyConfig } from '@/shared/api'

export interface DraftHazard {
  instanceId: string
  name: string
  level: number
  type: HazardType
}

export interface DraftCreature {
  instanceId: string
  creatureId: string
  name: string
  level: number
  adjustedLevel: number
  tier: WeakEliteTier
}

export interface EncounterBuilderState {
  draftCreatures: DraftCreature[]
  draftHazards: DraftHazard[]
  partyLevel: number
  partySize: number
  isLoaded: boolean

  addCreatureToDraft: (creature: { creatureId: string; name: string; level: number; tier?: WeakEliteTier }) => void
  removeCreatureFromDraft: (instanceId: string) => void
  addHazardToDraft: (hazard: { name: string; level: number; type: HazardType }) => void
  removeHazardFromDraft: (instanceId: string) => void
  setPartyLevel: (level: number) => void
  setPartySize: (size: number) => void
  clearDraft: () => void
  loadConfig: () => Promise<void>
}

let instanceCounter = 0

export const useEncounterBuilderStore = create<EncounterBuilderState>()(
  immer((set, get) => ({
    draftCreatures: [],
    draftHazards: [],
    partyLevel: 1,
    partySize: 4,
    isLoaded: false,

    addCreatureToDraft: (creature) =>
      set((state) => {
        const tier = creature.tier ?? 'normal'
        // Use shared engine helper so XP-budget math stays consistent with
        // the post-mount display label (handles level -1/0/1 clamps).
        const adjustedLevel = getAdjustedLevel(tier, creature.level)
        state.draftCreatures.push({
          instanceId: `draft-${++instanceCounter}`,
          creatureId: creature.creatureId,
          name: creature.name,
          level: creature.level,
          adjustedLevel,
          tier,
        })
      }),

    removeCreatureFromDraft: (instanceId) =>
      set((state) => {
        state.draftCreatures = state.draftCreatures.filter((c) => c.instanceId !== instanceId)
      }),

    addHazardToDraft: (hazard) =>
      set((state) => {
        state.draftHazards.push({
          instanceId: `hazard-${++instanceCounter}`,
          name: hazard.name,
          level: hazard.level,
          type: hazard.type,
        })
      }),

    removeHazardFromDraft: (instanceId) =>
      set((state) => {
        state.draftHazards = state.draftHazards.filter((h) => h.instanceId !== instanceId)
      }),

    setPartyLevel: (level) => {
      set((state) => {
        state.partyLevel = Math.max(1, Math.min(20, level))
      })
      const s = get()
      savePartyConfig({ partyLevel: s.partyLevel, partySize: s.partySize })
    },

    setPartySize: (size) => {
      set((state) => {
        state.partySize = Math.max(1, Math.min(8, size))
      })
      const s = get()
      savePartyConfig({ partyLevel: s.partyLevel, partySize: s.partySize })
    },

    clearDraft: () =>
      set((state) => {
        state.draftCreatures = []
        state.draftHazards = []
      }),

    loadConfig: async () => {
      const config = await loadPartyConfig()
      set((state) => {
        state.partyLevel = config.partyLevel
        state.partySize = config.partySize
        state.isLoaded = true
      })
    },
  }))
)

export function selectEncounterResult(state: EncounterBuilderState): EncounterResult {
  const levels = state.draftCreatures.map((c) => c.adjustedLevel)
  const hazards = state.draftHazards.map((h) => ({ level: h.level, type: h.type }))
  return calculateXP(levels, hazards, state.partyLevel, state.partySize)
}

export function selectBudgets(state: EncounterBuilderState): Record<ThreatRating, number> {
  return generateEncounterBudgets(state.partySize)
}

export function selectThreatRating(state: EncounterBuilderState): ThreatRating {
  return selectEncounterResult(state).rating
}
