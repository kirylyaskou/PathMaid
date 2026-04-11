import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { batchInsertEntities, getLocalizeValue } from './sync-core'
import { extractAndInsertSpells, extractCreatureSpellcasting } from './sync-spells'
import { extractAndInsertItems, extractCreatureItems } from './sync-items'
import { extractAndInsertConditions } from './sync-conditions'
import { extractAndInsertHazards } from './sync-hazards'
import { extractAndInsertActions } from './sync-actions'
import { resolveUUIDTokensInDescriptions } from './sync-resolve'
import type { RawEntity, SyncProgress } from './types'

export type { SyncProgressCallback } from './types'

export async function syncFoundryData(
  onProgress?: import('./types').SyncProgressCallback
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

    onProgress?.('Importing spells...', 0, 0)
    await extractAndInsertSpells(entities)

    onProgress?.('Importing spellcasting data...', 0, 0)
    await extractCreatureSpellcasting(entities)

    onProgress?.('Importing items...', 0, 0)
    await extractAndInsertItems(entities)

    onProgress?.('Importing creature inventories...', 0, 0)
    await extractCreatureItems(entities)

    onProgress?.('Importing conditions...', 0, 0)
    await extractAndInsertConditions(entities)

    onProgress?.('Importing hazards...', 0, 0)
    await extractAndInsertHazards(entities)

    onProgress?.('Importing actions...', 0, 0)
    await extractAndInsertActions(entities)

    onProgress?.('Resolving item links...', 0, 0)
    await resolveUUIDTokensInDescriptions()

    return entities.length
  } finally {
    unlisten()
  }
}

export async function importLocalPacks(
  packDir: string,
  onProgress?: import('./types').SyncProgressCallback
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

    onProgress?.('Importing spells...', 0, 0)
    await extractAndInsertSpells(entities)

    onProgress?.('Importing spellcasting data...', 0, 0)
    await extractCreatureSpellcasting(entities)

    onProgress?.('Importing items...', 0, 0)
    await extractAndInsertItems(entities)

    onProgress?.('Importing creature inventories...', 0, 0)
    await extractCreatureItems(entities)

    onProgress?.('Importing conditions...', 0, 0)
    await extractAndInsertConditions(entities)

    onProgress?.('Importing hazards...', 0, 0)
    await extractAndInsertHazards(entities)

    onProgress?.('Importing actions...', 0, 0)
    await extractAndInsertActions(entities)

    onProgress?.('Resolving item links...', 0, 0)
    await resolveUUIDTokensInDescriptions()

    return entities.length
  } finally {
    unlisten()
  }
}
