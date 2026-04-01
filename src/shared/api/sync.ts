import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getDb } from '@/shared/db'
import { setSyncMetadata } from './db'

interface RawEntity {
  id: string
  name: string
  entity_type: string
  level: number | null
  hp: number | null
  ac: number | null
  fort: number | null
  ref_save: number | null
  will: number | null
  perception: number | null
  traits: string | null
  rarity: string | null
  size: string | null
  source_pack: string | null
  raw_json: string
}

interface SyncProgress {
  stage: string
  current: number
  total: number
}

export type SyncProgressCallback = (stage: string, current: number, total: number) => void

const BATCH_SIZE = 500

async function batchInsertEntities(
  entities: RawEntity[],
  onProgress?: SyncProgressCallback
): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM entities', [])

  const total = entities.length
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((e) => [
      e.id,
      e.name,
      e.entity_type,
      e.level,
      e.hp,
      e.ac,
      e.fort,
      e.ref_save,
      e.will,
      e.perception,
      e.traits,
      e.rarity,
      e.size,
      e.source_pack,
      e.raw_json,
    ])

    await db.execute(
      `INSERT OR REPLACE INTO entities (id, name, type, level, hp, ac, fort, ref, will, perception, traits, rarity, size, source_pack, raw_json) VALUES ${placeholders}`,
      values
    )

    onProgress?.(
      `Importing entities (${Math.min(i + BATCH_SIZE, total)} / ${total})...`,
      Math.min(i + BATCH_SIZE, total),
      total
    )
  }

  onProgress?.('Building search index...', total, total)
  await db.execute(
    "INSERT INTO entities_fts(entities_fts) VALUES('rebuild')",
    []
  )

  await setSyncMetadata('entity_count', String(total))
  await setSyncMetadata('last_sync_date', new Date().toISOString())
}

export async function syncFoundryData(
  onProgress?: SyncProgressCallback
): Promise<number> {
  const unlisten = await listen<SyncProgress>('sync-progress', (event) => {
    onProgress?.(event.payload.stage, event.payload.current, event.payload.total)
  })

  try {
    onProgress?.('Downloading ZIP...', 0, 0)
    const entities = await invoke<RawEntity[]>('sync_foundry_data', {
      url: null,
    })

    onProgress?.('Importing entities...', 0, entities.length)
    await batchInsertEntities(entities, onProgress)

    return entities.length
  } finally {
    unlisten()
  }
}

export async function importLocalPacks(
  packDir: string,
  onProgress?: SyncProgressCallback
): Promise<number> {
  const unlisten = await listen<SyncProgress>('sync-progress', (event) => {
    onProgress?.(event.payload.stage, event.payload.current, event.payload.total)
  })

  try {
    onProgress?.('Reading local packs...', 0, 0)
    const entities = await invoke<RawEntity[]>('import_local_packs', {
      packDir,
    })

    onProgress?.('Importing entities...', 0, entities.length)
    await batchInsertEntities(entities, onProgress)

    return entities.length
  } finally {
    unlisten()
  }
}
