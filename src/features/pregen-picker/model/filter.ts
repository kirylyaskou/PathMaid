// Phase 71 — pure filter helpers for the shared pregen picker.
// Extracted from the dialog component so the search + source-scope logic
// is unit-testable without mounting React.

import type { CharacterRecord } from '@/shared/api'

export const ICONICS_TOKEN = '__iconics__'

/**
 * Turn a stored source_adventure token into a user-facing label.
 *   NULL     — treated as user import; picker should never hand this in,
 *              but label falls back to the sentinel anyway.
 *   __iconics__ → "Iconics"
 *   <slug>   → "PF <Slug Words>"
 */
export function sourceLabel(token: string): string {
  if (token === ICONICS_TOKEN) return 'Iconics'
  return (
    'PF ' +
    token
      .split('-')
      .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ')
  )
}

/**
 * Derive the ordered list of distinct source tokens present in the given
 * pregen rows. Order: Iconics first, then adventure slugs alphabetically.
 * Rows whose `sourceAdventure` is null are ignored (they are user imports
 * and don't belong in the pregen picker).
 */
export function derivePregenSources(rows: CharacterRecord[]): string[] {
  const seen = new Set<string>()
  for (const r of rows) {
    if (r.sourceAdventure) seen.add(r.sourceAdventure)
  }
  const arr = Array.from(seen)
  const ordered: string[] = []
  if (seen.has(ICONICS_TOKEN)) ordered.push(ICONICS_TOKEN)
  ordered.push(...arr.filter((t) => t !== ICONICS_TOKEN).sort())
  return ordered
}

/**
 * Case-insensitive substring match on name + optional source scope.
 *   source === null → all pregen sources (iconics + all adventures).
 *   source === '__iconics__' → only iconic rows.
 *   source === slug → only rows whose `sourceAdventure` matches the slug.
 */
export function filterPregens(
  rows: CharacterRecord[],
  search: string,
  source: string | null,
): CharacterRecord[] {
  const q = search.trim().toLowerCase()
  return rows.filter((r) => {
    if (!r.sourceAdventure) return false
    if (source !== null && r.sourceAdventure !== source) return false
    if (q && !r.name.toLowerCase().includes(q)) return false
    return true
  })
}
