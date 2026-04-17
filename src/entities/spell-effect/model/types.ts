export interface SpellEffectRow {
  id: string
  name: string
  rules_json: string
  duration_json: string
  description: string | null
  spell_id: string | null
  level: number  // 60-02: COALESCE(spells.rank, 1) — used for @item.level eval
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
  level: number           // 60-02: @item.level for FlatModifier expression eval (Heroism etc.)
}
