import { getDb } from '@/shared/db'

export interface CharacterGroup {
  id: string
  name: string
  characterIds: string[]
}

export async function getCharacterGroups(): Promise<CharacterGroup[]> {
  const db = await getDb()
  const rows = await db.select<{ id: string; name: string; character_ids: string }[]>(
    'SELECT id, name, character_ids FROM character_groups ORDER BY name COLLATE NOCASE',
    [],
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    characterIds: JSON.parse(row.character_ids) as string[],
  }))
}

export async function saveCharacterGroup(group: CharacterGroup): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO character_groups (id, name, character_ids) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, character_ids = excluded.character_ids`,
    [group.id, group.name.trim(), JSON.stringify(group.characterIds)],
  )
}

export async function deleteCharacterGroup(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM character_groups WHERE id = ?', [id])
}
