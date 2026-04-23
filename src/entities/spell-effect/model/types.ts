export type SpellEffectCategory = 'spell' | 'alchemical' | 'other'

export interface SpellEffectRow {
  id: string
  name: string
  rules_json: string
  duration_json: string
  description: string | null
  spell_id: string | null
  level: number  // COALESCE(spells.rank, 1) — used for @item.level eval
  category: SpellEffectCategory  // derived at API layer for picker grouping
}

export interface ActiveEffect {
  id: string              // encounter_combatant_effects PK (generated UUID at apply time)
  combatantId: string
  effectId: string        // FK -> spell_effects.id
  effectName: string      // denormalized for display (already stripped of "Spell Effect: " prefix)
  remainingTurns: number
  rulesJson: string       // raw from spell_effects for engine processing
  durationJson: string
  description: string | null
  // @item.level for FlatModifier/DamageDice expression eval. Holds cast rank
  // when the effect was applied from a heightened cast, spell base rank
  // otherwise. `castAtRank` preserves the user-visible intent separately so
  // UIs can distinguish "Fireball @ rank 8" from "Fireball (base 3)".
  level: number
  castAtRank?: number
}
