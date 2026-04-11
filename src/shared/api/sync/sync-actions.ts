import { getDb } from '@/shared/db'
import { BATCH_SIZE } from './types'
import { FOLDER_TO_CATEGORY } from './sync-core'
import type { RawEntity } from './types'

interface RawAction {
  id: string
  name: string
  action_type: string
  action_cost: number | null
  category: string | null
  action_category: string
  description: string | null
  traits: string | null
  source_book: string | null
}

export async function extractAndInsertActions(entities: RawEntity[]): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM actions', [])

  const actions: RawAction[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'action') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const folder: string | undefined = raw.folder
      if (!folder || !FOLDER_TO_CATEGORY[folder]) continue

      const sys = raw.system ?? {}
      const traits = sys.traits?.value
      const actionType: string = sys.actionType?.value ?? 'action'
      const actionCost: number | null = typeof sys.actions?.value === 'number' ? sys.actions.value : null

      actions.push({
        id: entity.id,
        name: entity.name,
        action_type: actionType,
        action_cost: actionCost,
        category: sys.category ?? null,
        action_category: FOLDER_TO_CATEGORY[folder],
        description: sys.description?.value ?? null,
        traits: Array.isArray(traits) && traits.length ? JSON.stringify(traits) : null,
        source_book: sys.publication?.title || null,
      })
    } catch {
      // skip malformed action JSON
    }
  }

  for (let i = 0; i < actions.length; i += BATCH_SIZE) {
    const batch = actions.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((a) => [
      a.id, a.name, a.action_type, a.action_cost, a.category,
      a.action_category, a.description, a.traits, a.source_book,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO actions (id, name, action_type, action_cost, category, action_category, description, traits, source_book) VALUES ${placeholders}`,
      values
    )
  }
}
