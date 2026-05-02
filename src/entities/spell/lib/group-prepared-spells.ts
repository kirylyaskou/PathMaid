import type { GroupedSpellEntry } from '../model/types'

export interface GroupableSlot {
  name: string
  foundryId: string | null
  slotKey: string
}

/**
 * Collapse prepared/innate slot instances into one entry per
 * `${name}:${foundryId}` group. Preserves first-seen order so the visible
 * row ordering stays stable across re-renders. slotKeys retain the order
 * they were inserted, so the consumer can pop the next available slot
 * deterministically.
 */
export function groupPreparedSpells<T extends GroupableSlot>(slots: T[]): GroupedSpellEntry[] {
  const order: string[] = []
  const byKey = new Map<string, GroupedSpellEntry>()
  for (const s of slots) {
    const key = `${s.name}:${s.foundryId ?? ''}`
    const existing = byKey.get(key)
    if (existing) {
      existing.slotKeys.push(s.slotKey)
      existing.totalCount += 1
    } else {
      order.push(key)
      byKey.set(key, {
        name: s.name,
        foundryId: s.foundryId,
        slotKeys: [s.slotKey],
        totalCount: 1,
      })
    }
  }
  return order.map((k) => byKey.get(k)!)
}
