import type { CreatureStatBlockData } from '@/entities/creature'
import { downloadCustomCreaturePathmaid } from './importExport'

export function exportCreatureJson(statBlock: CreatureStatBlockData): string {
  return downloadCustomCreaturePathmaid(statBlock)
}
