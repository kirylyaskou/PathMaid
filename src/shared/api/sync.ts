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
  source_name: string | null
}

interface SyncProgress {
  stage: string
  current: number
  total: number
}

export type SyncProgressCallback = (stage: string, current: number, total: number) => void

const BATCH_SIZE = 500

function getLocalizeValue(obj: Record<string, unknown>, dotPath: string): string | undefined {
  const parts = dotPath.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

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
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
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
      e.source_name,
    ])

    await db.execute(
      `INSERT OR REPLACE INTO entities (id, name, type, level, hp, ac, fort, ref, will, perception, traits, rarity, size, source_pack, raw_json, source_name) VALUES ${placeholders}`,
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

    // Download en.json for @Localize token resolution
    let enJson: Record<string, unknown> = {}
    try {
      onProgress?.('Downloading localization data...', 0, 0)
      const enResponse = await fetch(
        'https://raw.githubusercontent.com/foundryvtt/pf2e/v13-dev/static/lang/en.json'
      )
      if (enResponse.ok) {
        enJson = await enResponse.json() as Record<string, unknown>
      }
    } catch {
      // en.json download failure is non-fatal — @Localize tokens remain in raw_json
      // and will be stripped by resolveFoundryTokens() fallback at display time
    }

    // Resolve @Localize tokens in raw_json before inserting into SQLite
    // Values must be JSON-escaped since they're spliced into a JSON string
    if (Object.keys(enJson).length > 0) {
      for (const entity of entities) {
        entity.raw_json = entity.raw_json.replace(
          /@Localize\[([^\]]+)\]/g,
          (_, key: string) => {
            const val = getLocalizeValue(enJson, key) ?? ''
            return JSON.stringify(val).slice(1, -1)
          }
        )
      }
    }

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
