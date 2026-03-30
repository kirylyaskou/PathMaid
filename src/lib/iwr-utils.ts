// ─── IWR Utilities ───────────────────────────────────────────────────────────
// Shared parsing and formatting helpers for Immunity/Weakness/Resistance data.
// Extracted from StatBlock.vue for reuse in combat store and creature cards.

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IwrData {
  immunities: Array<{ type: string; exceptions: string[] }>
  weaknesses: Array<{ type: string; value: number; exceptions: string[] }>
  resistances: Array<{ type: string; value: number; exceptions: string[] }>
}

// ─── parseIwrData ─────────────────────────────────────────────────────────────

/**
 * Parses IWR data from a raw Foundry VTT entity JSON object.
 * Returns undefined if the raw data has no system.attributes or all IWR arrays are empty.
 *
 * @param raw - The parsed JSON object from entity.rawData, or null
 */
export function parseIwrData(raw: Record<string, unknown> | null): IwrData | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attrs = (raw as any)?.system?.attributes
  if (!attrs) return undefined

  const immunities = ((attrs.immunities ?? []) as Array<Record<string, unknown>>).map(e => ({
    type: (e.type as string) ?? '',
    exceptions: (e.exceptions as string[]) ?? [],
  }))
  const weaknesses = ((attrs.weaknesses ?? []) as Array<Record<string, unknown>>).map(e => ({
    type: (e.type as string) ?? '',
    value: (e.value as number) ?? 0,
    exceptions: (e.exceptions as string[]) ?? [],
  }))
  const resistances = ((attrs.resistances ?? []) as Array<Record<string, unknown>>).map(e => ({
    type: (e.type as string) ?? '',
    value: (e.value as number) ?? 0,
    exceptions: (e.exceptions as string[]) ?? [],
  }))

  if (!immunities.length && !weaknesses.length && !resistances.length) return undefined

  return { immunities, weaknesses, resistances }
}

// ─── formatIwrType ────────────────────────────────────────────────────────────

/**
 * Converts a PF2e slug to a human-readable title-cased label.
 * Examples: 'fire' → 'Fire', 'cold-iron' → 'Cold Iron'
 *
 * @param slug - The PF2e slug string (e.g. 'cold-iron', 'critical-hits')
 */
export function formatIwrType(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
