import { applyAdjustStrikes } from '@engine'
import type { DieFace } from '@engine'

type AdjustStrikeInput = Parameters<typeof applyAdjustStrikes>[1][number]

export interface StrikeDamage {
  formula: string
  type: string
  persistent?: boolean
}

// Apply AdjustStrike / DamageDice step-up plus PF2e Enlarge-class melee
// status bonus (+2/+4) to the constant term of a strike's first damage
// formula. Enlarge does NOT step dice per Player Core pg. 329 — dice are
// fixed by the weapon; legitimate die step-up comes from AdjustStrike rules
// (e.g. Giant Instinct).
export function applyStrikeDamageAdjustments(
  damage: readonly StrikeDamage[],
  strikeName: string,
  adjustStrikeInputs: readonly AdjustStrikeInput[],
  meleeStatusBonus: number,
): StrikeDamage[] {
  return damage.map((d, idx) => {
    if (idx !== 0) return d
    const dieMatch = /^(\d+)(d\d+)([+\-]\d+)?/.exec(d.formula)
    if (!dieMatch) return d

    let dieSize = dieMatch[2] as DieFace
    const strikeDamageSlug = strikeName.toLowerCase().replace(/\s+/g, '-') + '-damage'

    if (adjustStrikeInputs.length > 0) {
      const adjusted = applyAdjustStrikes(
        { selectors: ['strike-damage', strikeDamageSlug], dieSize },
        [...adjustStrikeInputs],
      )
      dieSize = adjusted.dieSize
    }

    let newFormula = d.formula
    if (dieSize !== (dieMatch[2] as DieFace)) {
      newFormula = newFormula.replace(/d\d+/, dieSize)
    }
    if (meleeStatusBonus !== 0) {
      const existingConst = dieMatch[3] ? parseInt(dieMatch[3], 10) : 0
      const total = existingConst + meleeStatusBonus
      const constRe = /([+\-]\d+)(?=\s|$|\s*\w)/
      if (dieMatch[3] && constRe.test(newFormula)) {
        newFormula = newFormula.replace(
          constRe,
          total >= 0 ? `+${total}` : `${total}`,
        )
      } else {
        newFormula = newFormula.replace(
          /^(\d+d\d+)/,
          `$1${total >= 0 ? '+' : ''}${total}`,
        )
      }
    }
    if (newFormula === d.formula) return d
    return { ...d, formula: newFormula }
  })
}
