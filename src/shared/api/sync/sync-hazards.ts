import { getDb } from '@/shared/db'
import { BATCH_SIZE } from './types'
import type { RawEntity } from './types'

interface RawHazardAction {
  name: string
  actionType: string
  description: string | null
}

interface RawHazard {
  id: string
  name: string
  level: number
  is_complex: number
  hazard_type: string
  stealth_dc: number | null
  stealth_details: string | null
  ac: number | null
  hardness: number | null
  hp: number | null
  has_health: number
  description: string | null
  disable_details: string | null
  reset_details: string | null
  traits: string | null
  source_book: string | null
  source_pack: string | null
  actions_json: string | null
}

export async function extractAndInsertHazards(entities: RawEntity[]): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM hazards', [])

  const hazards: RawHazard[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'hazard') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const attrs = sys.attributes ?? {}
      const details = sys.details ?? {}

      const isComplex = details.isComplex ? 1 : 0
      const hazardType = isComplex ? 'complex' : 'simple'

      // Parse hazard actions from items array
      const rawItems: unknown[] = raw.items ?? []
      const actions: RawHazardAction[] = []
      for (const item of rawItems) {
        const it = item as Record<string, unknown>
        if (it.type !== 'action') continue
        const itSys = (it.system as Record<string, unknown>) ?? {}
        const actionTypeSys = (itSys.actionType as Record<string, unknown>) ?? {}
        actions.push({
          name: it.name as string,
          actionType: (actionTypeSys.value as string) ?? 'passive',
          description: (itSys.description as Record<string, unknown>)?.value as string ?? null,
        })
      }

      const stealthRaw = attrs.stealth as Record<string, unknown> | undefined
      const hpRaw = attrs.hp as Record<string, unknown> | undefined
      const traits = sys.traits?.value
      const hasHealth = attrs.hasHealth ? 1 : 0

      hazards.push({
        id: entity.id,
        name: entity.name,
        level: (details.level?.value as number) ?? entity.level ?? 0,
        is_complex: isComplex,
        hazard_type: hazardType,
        stealth_dc: typeof stealthRaw?.value === 'number' ? stealthRaw.value : null,
        stealth_details: typeof stealthRaw?.details === 'string' ? stealthRaw.details : null,
        ac: (attrs.ac as Record<string, unknown>)?.value as number ?? null,
        hardness: typeof attrs.hardness === 'number' ? attrs.hardness : null,
        hp: typeof hpRaw?.max === 'number' ? hpRaw.max : null,
        has_health: hasHealth,
        description: details.description?.value ?? null,
        disable_details: typeof details.disable === 'string' ? details.disable : null,
        reset_details: typeof details.reset === 'string' && details.reset ? details.reset : null,
        traits: Array.isArray(traits) && traits.length ? JSON.stringify(traits) : null,
        source_book: details.publication?.title || null,
        source_pack: entity.source_pack,
        actions_json: actions.length ? JSON.stringify(actions) : null,
      })
    } catch {
      // skip malformed hazard JSON
    }
  }

  for (let i = 0; i < hazards.length; i += BATCH_SIZE) {
    const batch = hazards.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((h) => [
      h.id, h.name, h.level, h.is_complex, h.hazard_type,
      h.stealth_dc, h.stealth_details, h.ac, h.hardness, h.hp, h.has_health,
      h.description, h.disable_details, h.reset_details,
      h.traits, h.source_book, h.source_pack, h.actions_json,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO hazards (id, name, level, is_complex, hazard_type, stealth_dc, stealth_details, ac, hardness, hp, has_health, description, disable_details, reset_details, traits, source_book, source_pack, actions_json) VALUES ${placeholders}`,
      values
    )
  }
}
