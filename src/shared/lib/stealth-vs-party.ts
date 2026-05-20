interface StealthCombatantInput {
  id: string
  kind: 'npc' | 'pc' | string
  displayName: string
  creatureRef?: string | null
  perception?: number | null
}

interface StealthCreatureInput {
  id: string
  perception: number
  stealth?: number | null
}

export interface StealthVsPartyRow {
  /** NPC combatant id */
  npcId: string
  /** Display name of the NPC */
  npcName: string
  /**
   * Stealth DC for this NPC.
   * In PF2e, if a creature doesn't have a dedicated Stealth skill, the GM
   * uses Perception + 10 as the Stealth DC. We follow the same convention
   * using the NPC's stat-block perception when available.
   */
  stealthDc: number | null
  /** For each PC: whether their Perception meets or beats the Stealth DC */
  pcChecks: PcPerceptionCheck[]
}

export interface PcPerceptionCheck {
  pcId: string
  pcName: string
  /** Perception modifier from the stat block (null = unknown, no stat block loaded) */
  perception: number | null
  /** True if perception >= stealthDc (null when either value is unknown) */
  spots: boolean | null
}

/**
 * Computes stealth-vs-party results for every NPC in the combatant list.
 *
 * Rules applied:
 * - NPC Stealth DC = (stat-block perception bonus) + 10. If the stat block is
 *   not loaded, stealthDc is null and all PC checks report spots: null.
 * - PC Perception comes from their loaded stat block. If missing, spots: null.
 * - Only 'npc' kind combatants are treated as potential hiders.
 * - Only 'pc' kind combatants are in the observing party.
 *
 * Pure function — no React, no store access, fully testable.
 */
export function computeStealthVsParty(
  combatants: StealthCombatantInput[],
  creatures: StealthCreatureInput[],
): StealthVsPartyRow[] {
  const creatureById = new Map(creatures.map((c) => [c.id, c]))

  const npcs = combatants.filter((c) => c.kind === 'npc')
  const pcs = combatants.filter((c) => c.kind === 'pc')

  return npcs.map((npc) => {
    const npcCombatant = npc.kind === 'npc' ? npc : null
    const npcCreature = npcCombatant?.creatureRef ? creatureById.get(npcCombatant.creatureRef) : undefined

    // Stealth DC = stealth modifier + 10 (DC = bonus + 10 by PF2e rules).
    // Fallback chain:
    //   1. stat-block stealth skill
    //   2. stat-block perception + 10 (PF2e convention)
    //   3. session-only perception from Quick Add NPC + 10
    let stealthDc: number | null = null
    if (npcCreature != null) {
      stealthDc = npcCreature.stealth != null
        ? npcCreature.stealth + 10
        : npcCreature.perception + 10
    } else if (npcCombatant != null && npcCombatant.perception != null) {
      stealthDc = npcCombatant.perception + 10
    }

    const pcChecks: PcPerceptionCheck[] = pcs.map((pc) => {
      const pcCreature = pc.kind === 'pc' && pc.creatureRef ? creatureById.get(pc.creatureRef) : undefined
      const perception = pcCreature != null ? pcCreature.perception : null

      const spots =
        perception != null && stealthDc != null ? perception >= stealthDc : null

      return {
        pcId: pc.id,
        pcName: pc.displayName,
        perception,
        spots,
      }
    })

    return {
      npcId: npc.id,
      npcName: npc.displayName,
      stealthDc,
      pcChecks,
    }
  })
}
