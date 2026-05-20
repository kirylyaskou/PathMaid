// 69-05: slug helper for encounter export filenames. Non-latin preserved,
// Windows-illegal + path-separator chars replaced with `-`.

import { describe, it, expect } from 'vitest'
import { slugifyEncounterName } from '../lib/export-encounter'

describe('slugifyEncounterName', () => {
  it('preserves Cyrillic characters', () => {
    expect(slugifyEncounterName('Братья дварфы')).toBe('Братья-дварфы.pathmaid')
  })

  it('replaces Windows-illegal characters with a dash', () => {
    expect(slugifyEncounterName('a<b>c:d"e/f\\g|h?i*j')).toBe('a-b-c-d-e-f-g-h-i-j.pathmaid')
  })

  it('collapses runs of dashes and trims edge dashes', () => {
    expect(slugifyEncounterName('---a  b---')).toBe('a-b.pathmaid')
  })

  it('collapses whitespace runs into single dashes', () => {
    expect(slugifyEncounterName('Room    12')).toBe('Room-12.pathmaid')
  })

  it('falls back to `encounter.pathmaid` for empty input', () => {
    expect(slugifyEncounterName('')).toBe('encounter.pathmaid')
    expect(slugifyEncounterName('   ')).toBe('encounter.pathmaid')
  })

  it('falls back to `encounter` if every char gets stripped', () => {
    expect(slugifyEncounterName('***')).toBe('encounter.pathmaid')
  })

  it('keeps plain ASCII intact', () => {
    expect(slugifyEncounterName('Goblin Ambush')).toBe('Goblin-Ambush.pathmaid')
  })
})
