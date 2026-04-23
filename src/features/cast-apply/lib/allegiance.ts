// allegiance classification for the target picker.
//
// Rule: PCs form one faction, NPCs + hazards form the other.
// No per-combatant faction override
//
// "Ally of caster" = same faction as caster (caster included only if they
//   are the sole member of their faction; otherwise excluded so the Allies
//   bucket doesn't double-list the self-row).
// "Enemy of caster" = opposing faction.

import type { Combatant } from '@/entities/combatant'

export type AllegianceFaction = 'pc' | 'npc'

export function factionOf(combatant: Combatant): AllegianceFaction {
  return combatant.kind === 'pc' ? 'pc' : 'npc'
}

export interface AllegianceBuckets {
  caster: Combatant | null
  allies: Combatant[]
  enemies: Combatant[]
}

/**
 * Split the roster into caster / allies / enemies relative to the caster.
 *
 * Caster is always its own bucket (caster.id match).
 * Allies = same faction as caster, excluding the caster.
 * Enemies = opposing faction.
 *
 * If the caster is not present in the roster (shouldn't normally happen) the
 * caller still gets allies/enemies split using the provided casterFaction.
 */
export function splitByAllegiance(
  combatants: Combatant[],
  casterId: string,
): AllegianceBuckets {
  const caster = combatants.find((c) => c.id === casterId) ?? null
  const casterFaction = caster ? factionOf(caster) : 'npc'

  const allies: Combatant[] = []
  const enemies: Combatant[] = []

  for (const c of combatants) {
    if (c.id === casterId) continue
    if (factionOf(c) === casterFaction) allies.push(c)
    else enemies.push(c)
  }

  return { caster, allies, enemies }
}
