// Raw creature row from SQLite — entities/creature maps this to the entity Creature type
export interface CreatureRow {
  id: string
  name: string
  level: number
  hp: number
  ac: number
  fort: number
  ref: number
  will: number
  perception: number
  traits: string
  rarity: string
  size: string
  type: string
  source_pack: string | null
  raw_json: string
}

// Stubs for Phase 7 — real SQL queries added in Plan 07-04

export async function fetchCreatures(): Promise<CreatureRow[]> {
  return []
}

export async function fetchCreatureById(_id: string): Promise<CreatureRow | null> {
  return null
}

export async function searchCreatures(_query: string, _limit?: number): Promise<CreatureRow[]> {
  return []
}
