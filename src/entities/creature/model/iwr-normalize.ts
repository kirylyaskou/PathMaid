// Normalizer helpers for the structured IWR shape. Consumers get monomorphic objects
// and can map/render without union-type narrowing at every usage site.
//
// Background: D-08 extends CreatureStatBlockData.immunities from string[] to
// (string | { type, exceptions? })[]. This helper lets UI render either legacy
// string entries or structured entries uniformly.

import type {
  ImmunityEntry,
  WeaknessEntry,
  ResistanceEntry,
} from './types'

export interface NormalizedImmunity {
  type: string
  exceptions?: string[]
}

export function normalizeImmunities(
  immunities: readonly ImmunityEntry[]
): NormalizedImmunity[] {
  return immunities.map((i) =>
    typeof i === 'string' ? { type: i } : { type: i.type, exceptions: i.exceptions }
  )
}

export function normalizeWeaknesses(
  weaknesses: readonly WeaknessEntry[]
): WeaknessEntry[] {
  return weaknesses.map((w) => ({
    type: w.type,
    value: w.value,
    exceptions: w.exceptions,
  }))
}

export function normalizeResistances(
  resistances: readonly ResistanceEntry[]
): ResistanceEntry[] {
  return resistances.map((r) => ({
    type: r.type,
    value: r.value,
    exceptions: r.exceptions,
  }))
}

export function formatImmunityWithExceptions(entry: NormalizedImmunity): string {
  if (!entry.exceptions || entry.exceptions.length === 0) return entry.type
  return `${entry.type} (except ${entry.exceptions.join(', ')})`
}
