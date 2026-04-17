// Deep-compare via JSON stringify. Acceptable performance at CreatureStatBlockData scale
// (~1-5KB of form state). Production alternative = dequal, but no new deps per CLAUDE.md.

import type { CreatureStatBlockData } from '@/entities/creature/model/types'

export function isDirty(
  current: CreatureStatBlockData,
  snapshot: CreatureStatBlockData,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(snapshot)
}
