export interface SpellRow {
  id: string
  name: string
  rank: number
  traditions: string | null   // JSON string[]
  traits: string | null       // JSON string[]
  description: string | null
  damage: string | null       // JSON object
  area: string | null         // JSON {type, value}
  range_text: string | null
  duration_text: string | null
  action_cost: string | null  // "1" | "2" | "3" | "free" | "reaction"
  save_stat: string | null    // "will" | "fortitude" | "reflex"
  source_book: string | null
  source_pack: string | null
  heightened_json: string | null   // JSON: { type:'interval', perRanks, damage:Record<key,string> } | { type:'fixed', levels } | null
}

export interface SpellcastingSection {
  entryId: string
  entryName: string
  tradition: string       // "arcane" | "divine" | "occult" | "primal"
  castType: string        // "prepared" | "spontaneous" | "innate" | "focus"
  spellDc: number
  spellAttack: number
  spellsByRank: SpellsByRank[]
}

export interface SpellsByRank {
  rank: number            // 0 = cantrips
  slots: number           // max slots (0 = unlimited for innate/focus)
  spells: SpellListEntry[]
}

export interface SpellListEntry {
  name: string
  foundryId: string | null  // references spells(id) if resolvable
  entryId: string
  // precomputed at load time (or patched by the combat-side
  // loader). `true` gates the Cast flame button on the row. `undefined` means
  // "unknown" and the editor treats it as "show the flame" — backward-compat
  // for existing callers (builder) that never populate it.
  hasLinkedEffect?: boolean
}
