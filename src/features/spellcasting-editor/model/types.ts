import type { SpellcastingSection } from '@/entities/spell'

/**
 * Cast-mode dispatcher for SpellcastingEditor.
 *
 * PF2e distinguishes five render modes:
 * - `cantrip` — rank-0 spells, no slots/pips, unlimited casts
 * - `prepared` — consumable copies, strike-through per slot instance
 * - `spontaneous` — shared pool, pips deplete on cast
 * - `innate` — consumable copies (like prepared), but per-spell frequency
 * - `focus` — focus pool (single global resource, no per-rank pips)
 */
export type CastMode = 'prepared' | 'spontaneous' | 'innate' | 'focus' | 'cantrip'

export function resolveCastMode(castType: SpellcastingSection['castType']): CastMode {
  switch (castType) {
    case 'prepared': return 'prepared'
    case 'spontaneous': return 'spontaneous'
    case 'innate': return 'innate'
    case 'focus': return 'focus'
    default: return 'spontaneous'
  }
}

export interface SlotInstance {
  kind: 'default' | 'added'
  name: string
  foundryId: string | null
  slotKey: string
}

/**
 * Shared `SpellcastingEditor` component API.
 *
 * The editor is a pure presentation component — state is passed in via props
 * and user actions surface via optional callbacks. Both combat (DB-backed)
 * and builder (state-machine-backed) callers bind this same surface.
 *
 * All callbacks are optional:
 *  - combat view-mode omits mutating callbacks (slot delta, add/remove spell)
 *  - builder omits cast callbacks (no live combat context to consume slots)
 */
export interface SpellcastingEditorProps {
  entry: SpellcastingSection
  creatureLevel: number
  mode: 'view' | 'edit'

  // Per-rank slot state + deltas (caller-computed)
  usedSlots: Record<number, number>
  slotDeltas: Record<number, number>

  // Prepared-cast state — `${rank}:${spellSlotKey}` membership marks the
  // specific prepared-spell instance as struck-through / consumed.
  preparedCasts: Set<string>

  // Overrides — added / removed spell sets (combat: DB overrides; builder: empty)
  removedSpells: Set<string>          // `${rank}:${name}`
  addedByRank: Record<number, string[]>

  // Callbacks — all optional for read-only / builder use
  onTogglePip?: (rank: number, idx: number, total: number) => void
  onSlotDelta?: (rank: number, delta: 1 | -1) => void
  onAddRank?: (rank: number) => void
  onAddSpell?: (name: string, rank: number, foundryId?: string | null) => void
  onRemoveSpell?: (name: string, rank: number, isDefault: boolean) => void
  // callbacks receive the spell identity so the combat-side caller
  // can open the TargetPickerDialog keyed to the right spell_effects row.
  // Builder callers never pass these — irrelevant.
  onCastPrepared?: (
    spellName: string,
    foundryId: string | null,
    rank: number,
    slotKey: string,
    total: number,
  ) => void
  onCastSpontaneous?: (
    spellName: string,
    foundryId: string | null,
    rank: number,
    total: number,
  ) => void

  // lookup a "cast flame" visibility for an added-by-rank spell
  // whose link is not known at entry-load time. Default `undefined` = treat
  // as "has link" (same backward-compat convention as hasLinkedEffect).
  hasLinkedEffectForAdded?: (name: string) => boolean | undefined

  // Optional UI hooks
  onOpenSpellSearch?: (rank: number) => void
  filteredRanks?: number[]            // rank-pill filter applied by caller
  onSelectSlotLevel?: (rank: number | null) => void
  selectedSlotLevel?: number | null
  minAvailableRank?: number | null
  rankWarning?: (rank: number) => string | null

  // Optional per-callsite context for SpellCard roll / source attribution.
  sourceName?: string
  combatId?: string
}
