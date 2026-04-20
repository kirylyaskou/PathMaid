// Phase 71 — unit tests for pregen picker filter/source-derivation logic.
// The PregenPickerDialog delegates all non-UI logic to these helpers so the
// behavior can be verified without mounting React.

import { describe, it, expect } from 'vitest'
import type { CharacterRecord } from '@/shared/api'
import {
  derivePregenSources,
  filterPregens,
  sourceLabel,
  ICONICS_TOKEN,
} from '../model/filter'

function row(
  partial: Partial<CharacterRecord> & { id: string; name: string },
): CharacterRecord {
  return {
    id: partial.id,
    name: partial.name,
    class: partial.class ?? null,
    level: partial.level ?? null,
    ancestry: partial.ancestry ?? null,
    rawJson: partial.rawJson ?? '{}',
    notes: partial.notes ?? '',
    createdAt: partial.createdAt ?? '2026-04-19T00:00:00.000Z',
    sourceAdventure: partial.sourceAdventure ?? null,
  }
}

const AMIRI = row({ id: '1', name: 'Amiri', sourceAdventure: ICONICS_TOKEN })
const EZREN = row({ id: '2', name: 'Ezren', sourceAdventure: ICONICS_TOKEN })
const BEGINNER_FIGHTER = row({
  id: '3',
  name: 'Valeros',
  sourceAdventure: 'beginner-box',
})
const SUNDERED = row({
  id: '4',
  name: 'Kyra',
  sourceAdventure: 'sundered-waves',
})
const USER_IMPORT = row({ id: '5', name: 'Homebrew Bob', sourceAdventure: null })

describe('sourceLabel', () => {
  it('labels iconics token as "Iconics"', () => {
    expect(sourceLabel(ICONICS_TOKEN)).toBe('Iconics')
  })

  it('prefixes adventure slugs with "PF" and title-cases each word', () => {
    expect(sourceLabel('beginner-box')).toBe('PF Beginner Box')
    expect(sourceLabel('sundered-waves')).toBe('PF Sundered Waves')
    expect(sourceLabel('rusthenge')).toBe('PF Rusthenge')
  })
})

describe('derivePregenSources', () => {
  it('returns Iconics first, then adventure slugs sorted alphabetically', () => {
    const rows = [SUNDERED, AMIRI, BEGINNER_FIGHTER, EZREN]
    expect(derivePregenSources(rows)).toEqual([
      ICONICS_TOKEN,
      'beginner-box',
      'sundered-waves',
    ])
  })

  it('omits user-imported rows (sourceAdventure null)', () => {
    expect(derivePregenSources([USER_IMPORT, AMIRI])).toEqual([ICONICS_TOKEN])
  })

  it('omits iconics token when no iconic rows present', () => {
    expect(derivePregenSources([BEGINNER_FIGHTER, SUNDERED])).toEqual([
      'beginner-box',
      'sundered-waves',
    ])
  })

  it('returns an empty list when no pregens are present', () => {
    expect(derivePregenSources([])).toEqual([])
    expect(derivePregenSources([USER_IMPORT])).toEqual([])
  })
})

describe('filterPregens', () => {
  const ALL = [AMIRI, EZREN, BEGINNER_FIGHTER, SUNDERED, USER_IMPORT]

  it('drops user-imported rows regardless of filters', () => {
    const out = filterPregens(ALL, '', null)
    expect(out.map((r) => r.id)).toEqual(['1', '2', '3', '4'])
  })

  it('scopes to iconics when source = __iconics__', () => {
    const out = filterPregens(ALL, '', ICONICS_TOKEN)
    expect(out.map((r) => r.name).sort()).toEqual(['Amiri', 'Ezren'])
  })

  it('scopes to adventure slug when source = slug', () => {
    const out = filterPregens(ALL, '', 'beginner-box')
    expect(out.map((r) => r.name)).toEqual(['Valeros'])
  })

  it('performs case-insensitive substring match on name', () => {
    expect(filterPregens(ALL, 'amir', null).map((r) => r.name)).toEqual(['Amiri'])
    expect(filterPregens(ALL, 'EZR', null).map((r) => r.name)).toEqual(['Ezren'])
  })

  it('combines search + source scope', () => {
    expect(filterPregens(ALL, 'k', 'sundered-waves').map((r) => r.name)).toEqual(['Kyra'])
    expect(filterPregens(ALL, 'k', ICONICS_TOKEN)).toEqual([])
  })

  it('treats whitespace-only search as empty', () => {
    const out = filterPregens(ALL, '   ', null)
    expect(out.map((r) => r.id)).toEqual(['1', '2', '3', '4'])
  })
})
