import { parseFormula, rollDice } from '../dice/dice'
import type { Roll, DiceEntry } from '../dice/dice'

export interface RollCritOptions {
  source?: string
  combatId?: string
  label?: string
}

/**
 * Roll critical-hit damage.
 *
 * PF2e Player Core p.275: "the attack deals double damage" — this implementation
 * rolls the base formula ONCE and multiplies the total by 2 (not roll twice
 * the dice). Then weapon traits are applied:
 *
 * - Fatal-d{N}: ALL base damage dice are rolled with the fatal die size instead
 *   of the weapon's normal die size, then 1 extra die of the fatal size is
 *   rolled and added (after doubling).
 * - Deadly-d{N}: 1 extra die of the deadly size is rolled and added (after
 *   doubling). Striking-rune scaling (greater +1, major +2) not handled here.
 *
 * Returns a Roll with explicit `breakdown` describing the full math, e.g.
 *   "(d4: 2 + 5) × 2 = 14"
 *   "(d12: 7 + 3) × 2 + d8: 5 = 25"
 * `modifier` is set to 0 so the UI never displays a magic composite number;
 * `breakdown` carries the explanation instead.
 */
export function rollCritDamage(
  formula: string,
  traits: readonly string[] = [],
  opts: RollCritOptions = {},
): Roll {
  const parsed = parseFormula(formula)

  let fatalSize: number | null = null
  for (const t of traits) {
    const m = /^fatal-d(\d+)$/i.exec(t)
    if (m) {
      fatalSize = parseInt(m[1], 10)
      break
    }
  }
  let deadlySize: number | null = null
  for (const t of traits) {
    const m = /^deadly-d(\d+)$/i.exec(t)
    if (m) {
      deadlySize = parseInt(m[1], 10)
      break
    }
  }

  // Fatal replaces base die size before the roll.
  const baseDiceSpec = fatalSize !== null
    ? parsed.dice.map((d) => ({ count: d.count, sides: fatalSize as number }))
    : parsed.dice
  const dicePart = baseDiceSpec.map((d) => `${d.count}d${d.sides}`).join('+')
  const modPart = parsed.modifier > 0
    ? `+${parsed.modifier}`
    : parsed.modifier < 0 ? `${parsed.modifier}` : ''
  const baseFormulaStr = (dicePart + modPart) || '0'

  const baseRoll = rollDice(baseFormulaStr, undefined, {
    source: opts.source,
    combatId: opts.combatId,
  })
  const baseTotal = baseRoll.total
  const doubledTotal = baseTotal * 2

  const dice: DiceEntry[] = [...baseRoll.dice]
  let extraTotal = 0
  let extraBreakdown = ''

  if (fatalSize !== null) {
    const fatalDie = rollDice(`1d${fatalSize}`)
    dice.push(...fatalDie.dice)
    extraTotal += fatalDie.total
    extraBreakdown += ` + d${fatalSize}: ${fatalDie.total}`
  }
  if (deadlySize !== null) {
    const deadlyDie = rollDice(`1d${deadlySize}`)
    dice.push(...deadlyDie.dice)
    extraTotal += deadlyDie.total
    extraBreakdown += ` + d${deadlySize}: ${deadlyDie.total}`
  }

  const finalTotal = doubledTotal + extraTotal

  // Build breakdown: "(d4: 2 + 5) × 2 + d8: 5 = 19"
  const baseDiceStrs: string[] = []
  for (const d of baseRoll.dice) baseDiceStrs.push(`d${d.sides}: ${d.value}`)
  const baseDicePartStr = baseDiceStrs.join(' + ')
  const baseModSuffix = parsed.modifier !== 0
    ? (parsed.modifier > 0 ? ` + ${parsed.modifier}` : ` − ${Math.abs(parsed.modifier)}`)
    : ''
  const innerExpr = baseDicePartStr.length > 0
    ? `${baseDicePartStr}${baseModSuffix}`
    : `${parsed.modifier}`
  const breakdown = `(${innerExpr}) × 2${extraBreakdown} = ${finalTotal}`

  const compositeFormula = `(${baseFormulaStr})×2`
    + (fatalSize !== null ? `+1d${fatalSize}` : '')
    + (deadlySize !== null ? `+1d${deadlySize}` : '')

  return {
    id: crypto.randomUUID(),
    formula: compositeFormula,
    dice,
    modifier: 0,
    total: finalTotal,
    label: opts.label,
    source: opts.source,
    combatId: opts.combatId,
    timestamp: Date.now(),
    breakdown,
  }
}
