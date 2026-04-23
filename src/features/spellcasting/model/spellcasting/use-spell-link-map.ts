import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSpellByName } from '@/shared/api'
import { getSpellEffectsForSpells } from '@/shared/api/effects'
import type { SpellOverrideRow, SpellRow } from '@/shared/api'
import type { SpellEffectRow } from '@/entities/spell-effect'
import type { SpellcastingSection } from '@/entities/spell'

export function useSpellLinkMap(
  section: SpellcastingSection,
  overrides: SpellOverrideRow[],
  encounterId?: string,
) {
  const [effectByName, setEffectByName] = useState<Map<string, SpellEffectRow>>(new Map())
  const [spellByName, setSpellByName] = useState<Map<string, SpellRow>>(new Map())

  useEffect(() => {
    if (!encounterId) return
    const refs: Array<{ foundryId: string | null; name: string }> = []
    for (const byRank of section.spellsByRank) {
      for (const s of byRank.spells) {
        refs.push({ foundryId: s.foundryId, name: s.name })
      }
    }
    for (const o of overrides) {
      if (!o.isRemoved) refs.push({ foundryId: null, name: o.spellName })
    }
    if (refs.length === 0) {
      setEffectByName(new Map())
      return
    }
    let cancelled = false
    getSpellEffectsForSpells(refs).then((map) => {
      if (!cancelled) setEffectByName(map)
    })
    return () => {
      cancelled = true
    }
  }, [encounterId, section.spellsByRank, overrides])

  const sectionWithLinkFlags = useMemo<SpellcastingSection>(() => {
    if (!encounterId || (effectByName.size === 0 && section.spellsByRank.every((r) => r.spells.every((s) => s.hasLinkedEffect === undefined)))) {
      return section
    }
    return {
      ...section,
      spellsByRank: section.spellsByRank.map((byRank) => ({
        ...byRank,
        spells: byRank.spells.map((s) => ({
          ...s,
          hasLinkedEffect: effectByName.has(s.name.trim().toLowerCase()),
        })),
      })),
    }
  }, [section, effectByName, encounterId])

  const hasLinkedEffectForAdded = useCallback(
    (name: string): boolean => effectByName.has(name.trim().toLowerCase()),
    [effectByName],
  )

  const ensureSpellRow = useCallback(
    async (name: string): Promise<SpellRow | null> => {
      const key = name.trim().toLowerCase()
      const cached = spellByName.get(key)
      if (cached) return cached
      const row = await getSpellByName(name)
      if (row) {
        setSpellByName((prev) => {
          const next = new Map(prev)
          next.set(key, row)
          return next
        })
      }
      return row
    },
    [spellByName],
  )

  const getCastEffect = useCallback(
    (name: string): SpellEffectRow | null => {
      return effectByName.get(name.trim().toLowerCase()) ?? null
    },
    [effectByName],
  )

  return {
    effectByName,
    sectionWithLinkFlags,
    hasLinkedEffectForAdded,
    ensureSpellRow,
    getCastEffect,
  }
}
