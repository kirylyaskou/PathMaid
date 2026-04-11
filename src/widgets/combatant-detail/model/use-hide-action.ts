import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { useCombatantStore } from '@/entities/combatant'
import { useRoll } from '@/shared/hooks'
import { formatRollFormula } from '@/shared/lib/format'
import { getCharacterById } from '@/shared/api'
import { proficiencyModifier } from '@engine'
import type { PathbuilderBuild } from '@engine'
import type { CreatureStatBlockData } from '@/entities/creature'

/** Extracts the Hide action logic from HpControls into a standalone hook.
 *  Returns handleHide (async) and baseStealth (null if creature has no stealth). */
export function useHideAction(
  combatantId: string,
  combatantName: string,
  creature: CreatureStatBlockData | null | undefined,
  getModified: (base: number, statSlug: string) => number,
) {
  const doRoll = useRoll(combatantName)
  const allCombatants = useCombatantStore(useShallow((s) => s.combatants))

  const stealthSkill = creature?.skills.find((s) => s.name.toLowerCase() === 'stealth')
  const baseStealth = stealthSkill?.modifier ?? null

  const handleHide = useCallback(async () => {
    if (baseStealth === null) return
    const mod = getModified(baseStealth, 'stealth')
    const roll = doRoll(formatRollFormula(mod), 'Hide (Stealth)')

    const pcs = allCombatants.filter((c) => !c.isNPC && !c.isHazard && c.creatureRef)
    if (pcs.length === 0) return

    const pcResults: { name: string; perceptionDC: number }[] = []
    for (const pc of pcs) {
      try {
        const record = await getCharacterById(pc.creatureRef)
        if (!record) continue
        const build = JSON.parse(record.rawJson) as PathbuilderBuild
        const percMod = proficiencyModifier(build.proficiencies.perception, build.abilities.wis, build.level)
        pcResults.push({ name: pc.displayName, perceptionDC: 10 + percMod })
      } catch { /* skip */ }
    }
    if (pcResults.length === 0) return

    const sees = pcResults.filter((p) => roll.total < p.perceptionDC).map((p) => p.name)
    const doesntSee = pcResults.filter((p) => roll.total >= p.perceptionDC).map((p) => p.name)

    toast(`Hide: ${roll.total}`, {
      description: [
        sees.length > 0 ? `Видят: ${sees.join(', ')}` : null,
        doesntSee.length > 0 ? `Не видят: ${doesntSee.join(', ')}` : null,
      ].filter(Boolean).join(' | '),
      duration: 6000,
    })
  }, [baseStealth, getModified, doRoll, allCombatants])

  return { handleHide, baseStealth }
}
