import type { Rarity } from '@engine'
import type { CreatureRow } from '@/shared/api'
import { mapSize } from '@/shared/lib/size-map'
import type { Creature } from './types'

export function toCreature(row: CreatureRow): Creature {
  return {
    id: row.id,
    name: row.name,
    level: row.level ?? 0,
    hp: row.hp ?? 0,
    ac: row.ac ?? 0,
    fort: row.fort ?? 0,
    ref: row.ref ?? 0,
    will: row.will ?? 0,
    perception: row.perception ?? 0,
    traits: row.traits ? JSON.parse(row.traits) : [],
    rarity: (row.rarity ?? 'common') as Rarity,
    size: mapSize(row.size),
    type: row.type,
  }
}
