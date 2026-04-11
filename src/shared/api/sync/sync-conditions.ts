import { getDb } from '@/shared/db'
import { BATCH_SIZE } from './types'
import { parseModifierSummary } from './sync-core'
import type { RawEntity } from './types'

interface RawCondition {
  id: string
  name: string
  slug: string | null
  is_valued: number
  description: string | null
  group_name: string | null
  overrides: string | null
  rules_json: string | null
  modifier_summary: string | null
  source_book: string | null
}

export async function extractAndInsertConditions(entities: RawEntity[]): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM conditions', [])

  const conditions: RawCondition[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'condition') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const rules: unknown[] = sys.rules ?? []
      const overridesArr: string[] = sys.overrides ?? []
      const slug = sys.slug
        ?? entity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      conditions.push({
        id: entity.id,
        name: entity.name,
        slug,
        is_valued: sys.value?.isValued ? 1 : 0,
        description: sys.description?.value ?? null,
        group_name: sys.group ?? null,
        overrides: overridesArr.length ? JSON.stringify(overridesArr) : null,
        rules_json: rules.length ? JSON.stringify(rules) : null,
        modifier_summary: parseModifierSummary(rules) || null,
        source_book: sys.publication?.title || null,
      })
    } catch {
      // skip malformed condition JSON
    }
  }

  for (let i = 0; i < conditions.length; i += BATCH_SIZE) {
    const batch = conditions.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((c) => [
      c.id, c.name, c.slug, c.is_valued, c.description,
      c.group_name, c.overrides, c.rules_json, c.modifier_summary, c.source_book,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO conditions (id, name, slug, is_valued, description, group_name, overrides, rules_json, modifier_summary, source_book) VALUES ${placeholders}`,
      values
    )
  }
}
