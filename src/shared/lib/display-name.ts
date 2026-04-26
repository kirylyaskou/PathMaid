/**
 * Strip the `(*)` Uncommon-rarity marker that the pf2-locale-ru community
 * module appends to RU translations of Uncommon items / spells / feats.
 *
 * The convention is upstream — they tag the localized name with `(*)` so
 * Foundry users can spot Uncommon entries at a glance. PathMaid surfaces
 * rarity through a dedicated badge column (RARITY_COLORS), so the suffix
 * is visual noise here.
 *
 * Idempotent — strips one or more trailing `(*)` segments and the
 * whitespace that precedes them.
 */
export function stripRarityMarker(name: string): string {
  return name.replace(/\s*\(\*\)\s*$/u, '').trim()
}
