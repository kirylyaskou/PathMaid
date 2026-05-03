/**
 * Spontaneous casters share a single per-rank slot pool, so duplicate spell
 * names in the spell list contribute nothing — keep first occurrence per
 * `${name}:${foundryId}` and drop the rest. Generic over the slot shape so
 * both SpellListEntry (Bestiary) and SlotInstance (combat editor) work.
 */
export function dedupeSpontaneousSpells<T extends { name: string; foundryId: string | null }>(
  spells: T[],
): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const s of spells) {
    const key = `${s.name}:${s.foundryId ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}
