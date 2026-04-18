import { getDb } from '@/shared/db'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { BATCH_SIZE } from './types'
import type { RawEntity } from './types'

interface RawEffect {
  id: string
  name: string
  rules_json: string
  duration_json: string
  description: string | null
  spell_id: null
  source_pack: string | null
}

export async function extractAndInsertSpellEffects(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM spell_effects', [])

  const effects: RawEffect[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'effect') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      effects.push({
        id: entity.id,
        // 61-fix: PF2e data uses several display-prefixes ("Spell Effect:",
        // "Effect:", "Stance:", "Aura:"). Strip them so the canonical name
        // matches spells.name and FK resolution works in the UPDATE below.
        name: entity.name.replace(/^(?:Spell Effect|Effect|Stance|Aura):\s*/i, ''),
        rules_json: JSON.stringify(sys.rules ?? []),
        duration_json: JSON.stringify(sys.duration ?? {}),
        description: sanitizeFoundryText(sys.description?.value) || null,
        spell_id: null,
        // 61-fix: originating Foundry pack drives category detection
        // (spell-effects / equipment-effects / other-effects).
        source_pack: entity.source_pack,
      })
    } catch {
      // skip malformed effect JSON
    }
  }

  for (let i = 0; i < effects.length; i += BATCH_SIZE) {
    const batch = effects.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((e) => [
      e.id, e.name, e.rules_json, e.duration_json, e.description, e.spell_id, e.source_pack,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO spell_effects (id, name, rules_json, duration_json, description, spell_id, source_pack) VALUES ${placeholders}`,
      values
    )
  }

  // Resolve spell_id FK by name matching after batch insert
  if (effects.length > 0) {
    await db.execute(
      `UPDATE spell_effects
       SET spell_id = (
         SELECT s.id FROM spells s
         WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(spell_effects.name))
         LIMIT 1
       )
       WHERE spell_id IS NULL`,
      []
    )
  }
}
