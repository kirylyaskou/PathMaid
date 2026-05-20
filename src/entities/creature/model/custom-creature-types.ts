import type { CreatureStatBlockData } from './types'
import type { CustomCreatureRecord, CustomCreatureRow as ApiCustomCreatureRow } from '@/shared/api'

/** Flat row returned by getAllCustomCreatures() — no data_json parse needed for list view */
export type CustomCreatureRow = ApiCustomCreatureRow

/** Full custom creature with parsed stat block — returned by getCustomCreatureById() */
export type CustomCreatureStatBlock = CustomCreatureRecord<CreatureStatBlockData>
