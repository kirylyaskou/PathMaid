export function normalizeTraitSlug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  const reachMatch = /^reach[-\s]+(\d+)$/.exec(normalized)
  if (reachMatch) return `reach-${reachMatch[1]}`
  const rangeMatch = /^range[-\s]+(\d+)(?: feet| ft)?$/.exec(normalized)
  if (rangeMatch) return `range-${rangeMatch[1]}`
  return normalized.replace(/[\s_]+/g, '-')
}

export function normalizeTraitList(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>()
  const traits: string[] = []
  for (const value of values ?? []) {
    const slug = normalizeTraitSlug(value)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    traits.push(slug)
  }
  return traits
}
