import type { CreatureStatBlockData } from './types'

type Ability = CreatureStatBlockData['abilities'][number]

const OFFENSIVE_NAME = /strike|attack|bite|claw|breath|slam|gore|tail|tongue|spit|charge|rage|pounce|swallow|constrict|grab\b|trample|maul/i
const DEFENSIVE_NAME = /shield|block|parry|evasion|deflect|resist|ward|defense|defen[sc]e|regenerat|fortify|hardness|absorb/i

export interface ClassifiedAbilities {
  offensive: Ability[]
  defensive: Ability[]
  reactions: Ability[]
  other: Ability[]
}

/**
 * Classify creature abilities into Offensive / Defensive / Reactions / Other
 * using trait and name heuristics (no Foundry 'category' field available).
 */
export function classifyAbilities(
  abilities: Ability[],
  options?: { isSpecialFormation?: boolean; troopDefensesName?: string },
): ClassifiedAbilities {
  const offensive: Ability[] = []
  const defensive: Ability[] = []
  const reactions: Ability[] = []
  const other: Ability[] = []

  const { isSpecialFormation = false, troopDefensesName = '' } = options ?? {}

  for (const a of abilities) {
    if (isSpecialFormation) {
      const nameLower = a.name.toLowerCase()
      // Skip abilities shown in the troop formation section (Troop Defenses, Troop/Swarm Formation).
      if (troopDefensesName && nameLower === troopDefensesName) continue
      if (/^(troop|swarm)\s+formation$/i.test(a.name)) continue
    }
    if (a.actionCost === 'reaction') {
      reactions.push(a)
      continue
    }
    const traits = a.traits ?? []
    if (traits.includes('attack') || traits.includes('offensive') || OFFENSIVE_NAME.test(a.name)) {
      offensive.push(a)
      continue
    }
    if (traits.includes('defensive') || DEFENSIVE_NAME.test(a.name)) {
      defensive.push(a)
      continue
    }
    other.push(a)
  }

  return { offensive, defensive, reactions, other }
}
