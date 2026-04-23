export interface RawEntity {
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
  // adventure segment from paizo-pregens/<adventure>/... path.
  // Serde on the Rust side emits snake_case via #[derive(Serialize)], so the
  // field name matches the struct literally.
  source_adventure: string | null
}

export interface SyncProgress {
  stage: string
  current: number
  total: number
}

export type SyncProgressCallback = (stage: string, current: number, total: number) => void

export const BATCH_SIZE = 500
