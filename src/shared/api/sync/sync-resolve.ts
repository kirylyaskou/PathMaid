import { getDb } from '@/shared/db'
import { BATCH_SIZE } from './types'

/**
 * Post-processing pass: resolve @UUID[...] tokens without alias in item descriptions.
 * @UUID[Compendium.pf2e.equipment.Item.AbCdEfGhI] → looks up name from items/spells/entities
 * and replaces with human-readable name. Runs after all data is inserted.
 */
export async function resolveUUIDTokensInDescriptions(): Promise<void> {
  const db = await getDb()

  // Build id → name lookup from all three tables (items first — most complete)
  const idNameMap = new Map<string, string>()

  const itemRows = await db.select<{ id: string; name: string }[]>(
    'SELECT id, name FROM items', []
  )
  for (const r of itemRows) idNameMap.set(r.id, r.name)

  const spellRows = await db.select<{ id: string; name: string }[]>(
    'SELECT id, name FROM spells', []
  )
  for (const r of spellRows) idNameMap.set(r.id, r.name)

  const entityRows = await db.select<{ id: string; name: string }[]>(
    "SELECT id, name FROM entities WHERE type IN ('condition','action','feat','hazard')", []
  )
  for (const r of entityRows) idNameMap.set(r.id, r.name)

  // Regex: @UUID[...] WITHOUT a following {alias} block
  const UUID_RE = /@UUID\[([^\]]+)\](?!\{)/g

  function resolveUUID(path: string): string {
    // "Compendium.pf2e.equipment.Item.AbCdEfGhI" → extract Item ID segment
    const parts = path.split('.')
    const maybeId = parts[parts.length - 1]
    return idNameMap.get(maybeId) ?? maybeId
  }

  // Update items.description in batches (SELECT rows with unresolved @UUID)
  const itemsToFix = await db.select<{ id: string; description: string }[]>(
    `SELECT id, description FROM items WHERE description LIKE '%@UUID[%' AND description NOT GLOB '*@UUID[*]{*'`,
    []
  )
  for (let i = 0; i < itemsToFix.length; i += BATCH_SIZE) {
    const batch = itemsToFix.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const fixed = row.description.replace(UUID_RE, (_, path: string) => resolveUUID(path))
      if (fixed !== row.description) {
        await db.execute('UPDATE items SET description=? WHERE id=?', [fixed, row.id])
      }
    }
  }

  // Update spells.description
  const spellsToFix = await db.select<{ id: string; description: string }[]>(
    `SELECT id, description FROM spells WHERE description LIKE '%@UUID[%' AND description NOT GLOB '*@UUID[*]{*'`,
    []
  )
  for (let i = 0; i < spellsToFix.length; i += BATCH_SIZE) {
    const batch = spellsToFix.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const fixed = row.description.replace(UUID_RE, (_, path: string) => resolveUUID(path))
      if (fixed !== row.description) {
        await db.execute('UPDATE spells SET description=? WHERE id=?', [fixed, row.id])
      }
    }
  }
}
