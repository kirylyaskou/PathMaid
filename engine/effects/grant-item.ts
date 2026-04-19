// ─── GrantItem (Phase 65, D-65-06) ────────────────────────────────────────────
// Parse PF2e `GrantItem` rule elements. Foundry shape:
//   { key: "GrantItem", uuid: "Compendium.<pkgId>.<packId>.Item.<name>" }
//
// Narrow v1.4 scope: we only resolve grants that point at one of the three
// allow-listed effect packs (spell-effects, equipment-effects, boons-and-curses).
// Grants into conditionitems (Clumsy / Off-Guard / …) — the other common
// target — are intentionally deferred to v1.5; they belong to the conditions
// subsystem, which has its own apply pipeline.
//
// Parser only extracts the grantee name + pack id. Resolution against
// `spell_effects` (name-match) happens at the SQLite boundary in
// `src/shared/api/effects.ts::resolveGrantItemChildren`.

/** The three in-scope pack ids. Keep sorted — tested in 65-07 audit. */
export const SAME_PACK_EFFECT_PACKS = [
  'spell-effects',
  'equipment-effects',
  'boons-and-curses',
] as const

export type SamePackEffectPack = (typeof SAME_PACK_EFFECT_PACKS)[number]

export interface GrantItemInput {
  /** Effect name after the "Item." segment — matches spell_effects.name. */
  granteeName: string
  /** One of SAME_PACK_EFFECT_PACKS. */
  pack: SamePackEffectPack
  /** Raw UUID — kept for debug/UI. */
  uuid: string
}

// Compendium.<pkgId>.<packId>.Item.<name>
// Foundry allows dots inside <name>, so we match pack-id greedily to the
// third dot and take everything after "Item." as the name.
const UUID_RE = /^Compendium\.[^.]+\.([^.]+)\.Item\.(.+)$/

/**
 * Extract GrantItem rules that point at same-pack effect compendia. Out-of-scope
 * grants (conditionitems, feats, spells, etc.) are dropped silently.
 */
export function parseSpellEffectGrantItems(rulesJson: string): GrantItemInput[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  const out: GrantItemInput[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'GrantItem') continue
    const uuid = typeof r.uuid === 'string' ? r.uuid : null
    if (!uuid) continue
    const m = UUID_RE.exec(uuid)
    if (!m) continue
    const pack = m[1]
    if (!(SAME_PACK_EFFECT_PACKS as readonly string[]).includes(pack)) continue
    const granteeName = stripEffectPrefix(m[2].trim())
    if (!granteeName) continue
    out.push({
      granteeName,
      pack: pack as SamePackEffectPack,
      uuid,
    })
  }
  return out
}

// Strip the same display prefixes spell_effects.name is stripped of in
// migration 0032 ("Effect:", "Spell Effect:", "Stance:", "Aura:"). We
// duplicate the regex instead of importing from the API layer so the engine
// stays free of src/ imports.
function stripEffectPrefix(s: string): string {
  return s.replace(/^(?:Spell Effect|Effect|Stance|Aura):\s*/i, '').trim()
}
