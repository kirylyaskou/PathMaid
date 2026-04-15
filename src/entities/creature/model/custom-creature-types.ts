import type { CreatureStatBlockData } from './types'

/** Flat row returned by getAllCustomCreatures() — no data_json parse needed for list view */
export interface CustomCreatureRow {
  id: string
  name: string
  level: number
  rarity: string
  source_type: 'foundry_clone' | 'scratch'
  created_at: string
  updated_at: string
}

/** Full custom creature with parsed stat block — returned by getCustomCreatureById() */
export interface CustomCreatureStatBlock extends CustomCreatureRow {
  statBlock: CreatureStatBlockData
}
