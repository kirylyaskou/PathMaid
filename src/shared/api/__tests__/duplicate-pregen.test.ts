// Phase 71 — integration-flavored test for duplicatePregenAsUserCharacter.
// Mocks @/shared/db with an in-memory store that mimics the tiny subset of
// the characters table we touch (SELECT by name/LIKE + INSERT). Verifies:
//   - duplicate row is inserted with source_adventure = NULL
//   - name collision produces " (copy)" / " (copy N)" suffix
//   - embedded PathbuilderBuild.name is rewritten to the new name

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CharacterRecord } from '../characters'

// In-memory row shape mirrors the real DB columns we write.
type DbRow = {
  id: string
  name: string
  class: string | null
  level: number | null
  ancestry: string | null
  raw_json: string
  notes: string
  created_at: string
  source_adventure: string | null
  raw_foundry_json: string | null
}

const store: DbRow[] = []

function resetStore() {
  store.length = 0
}

const fakeDb = {
  async select<T>(query: string, params: unknown[]): Promise<T> {
    // Simple query router — enough for duplicatePregenAsUserCharacter.
    if (query.includes('WHERE name = ? OR name LIKE ?')) {
      const [exact, like] = params as [string, string]
      // Escape regex chars and translate SQL LIKE wildcards (% → .*).
      const prefix = like.slice(0, -1)
      const rx = new RegExp(
        '^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*$',
      )
      return store
        .filter((r) => r.name === exact || rx.test(r.name))
        .map((r) => ({ name: r.name })) as unknown as T
    }
    return [] as unknown as T
  },
  async execute(query: string, params: unknown[]): Promise<void> {
    if (!query.trim().toUpperCase().startsWith('INSERT')) return
    const [id, name, klass, level, ancestry, raw_json] = params as [
      string,
      string,
      string | null,
      number | null,
      string | null,
      string,
    ]
    store.push({
      id,
      name,
      class: klass,
      level,
      ancestry,
      raw_json,
      notes: '',
      created_at: new Date().toISOString(),
      source_adventure: null,
      raw_foundry_json: null,
    })
  },
}

vi.mock('@/shared/db', () => ({
  getDb: async () => fakeDb,
}))

// Import after vi.mock so the module picks up our stub.
const { duplicatePregenAsUserCharacter } = await import('../characters')

function pregen(overrides: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: 'pregen-1',
    name: 'Amiri',
    class: 'Barbarian',
    level: 1,
    ancestry: 'Human',
    rawJson: JSON.stringify({ name: 'Amiri', level: 1, class: 'Barbarian' }),
    notes: '',
    createdAt: '2026-04-19T00:00:00.000Z',
    sourceAdventure: '__iconics__',
    ...overrides,
  }
}

describe('duplicatePregenAsUserCharacter', () => {
  beforeEach(() => {
    resetStore()
  })

  it('inserts a new row with source_adventure = NULL and a fresh id', async () => {
    const { id, name } = await duplicatePregenAsUserCharacter(pregen())
    expect(id).not.toBe('pregen-1')
    expect(name).toBe('Amiri')
    expect(store).toHaveLength(1)
    expect(store[0].source_adventure).toBeNull()
    expect(store[0].raw_foundry_json).toBeNull()
  })

  it('rewrites the embedded PathbuilderBuild.name to match the new row name', async () => {
    // Pre-seed a collision so the new row is "Amiri (copy)".
    store.push({
      id: 'existing',
      name: 'Amiri',
      class: 'Barbarian',
      level: 1,
      ancestry: 'Human',
      raw_json: '{}',
      notes: '',
      created_at: 'x',
      source_adventure: '__iconics__',
      raw_foundry_json: null,
    })
    const { name } = await duplicatePregenAsUserCharacter(pregen())
    expect(name).toBe('Amiri (copy)')
    const parsed = JSON.parse(store[1].raw_json) as { name: string }
    expect(parsed.name).toBe('Amiri (copy)')
  })

  it('escalates the copy suffix for repeated collisions', async () => {
    // Seed Amiri + Amiri (copy) so next pick becomes "Amiri (copy 2)".
    store.push({
      id: 'a',
      name: 'Amiri',
      class: null,
      level: null,
      ancestry: null,
      raw_json: '{}',
      notes: '',
      created_at: 'x',
      source_adventure: '__iconics__',
      raw_foundry_json: null,
    })
    store.push({
      id: 'b',
      name: 'Amiri (copy)',
      class: null,
      level: null,
      ancestry: null,
      raw_json: '{}',
      notes: '',
      created_at: 'x',
      source_adventure: null,
      raw_foundry_json: null,
    })
    const { name } = await duplicatePregenAsUserCharacter(pregen())
    expect(name).toBe('Amiri (copy 2)')
  })

  it('survives a pregen whose rawJson is unparsable', async () => {
    const { name } = await duplicatePregenAsUserCharacter(
      pregen({ rawJson: 'not-json' }),
    )
    expect(name).toBe('Amiri')
    expect(store).toHaveLength(1)
    expect(store[0].raw_json).toBe('not-json')
  })
})
