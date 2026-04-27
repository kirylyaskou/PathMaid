import { getDb } from '@/shared/db'

export interface Hotkey {
  id: string
  action: string
  chord: string
}

export async function listHotkeys(): Promise<Hotkey[]> {
  const db = await getDb()
  return await db.select<Hotkey[]>(
    'SELECT id, action, chord FROM hotkeys ORDER BY action ASC',
    []
  )
}

export async function upsertHotkey(hotkey: Hotkey): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO hotkeys (id, action, chord) VALUES (?, ?, ?)`,
    [hotkey.id, hotkey.action, hotkey.chord]
  )
}

export async function deleteHotkey(id: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM hotkeys WHERE id = ?`, [id])
}
