// ─── Dice Rolling Engine ──────────────────────────────────────────────────────
// Pure TypeScript — no imports from src/ or @/

export interface DiceEntry {
  sides: number   // e.g. 6, 20 — plain number, NOT DieFace
  value: number   // rolled result, 1..sides
}

export interface Roll {
  id: string                  // crypto.randomUUID()
  formula: string             // original formula, e.g. "2d6+4"
  dice: DiceEntry[]           // each individual die rolled
  modifier: number            // sum of all flat +N/-N terms
  total: number               // sum of all dice values + modifier
  label?: string              // e.g. "Fireball damage", "Longsword attack"
  timestamp: number           // Date.now()
}

export interface ParsedFormula {
  dice: Array<{ count: number; sides: number }>   // e.g. [{count:2, sides:6}]
  modifier: number                                  // flat sum of +N/-N
}

const TOKEN_RE = /([+-]?\d*d\d+|[+-]?\d+)/gi

/**
 * Parse a PF2e dice formula string into structured components.
 * Handles: "2d6+4", "d20", "1d4+1d6", "+5", "1d6-2", "2d6+1d4+3"
 */
export function parseFormula(formula: string): ParsedFormula {
  if (!formula) return { dice: [], modifier: 0 }

  const normalized = formula.trim().replace(/\s+/g, '')
  if (!normalized) return { dice: [], modifier: 0 }

  const dice: Array<{ count: number; sides: number }> = []
  let modifier = 0

  const tokens = normalized.match(TOKEN_RE) ?? []

  for (const token of tokens) {
    const diceMatch = token.match(/^([+-]?\d*)d(\d+)$/i)
    if (diceMatch) {
      const countStr = diceMatch[1]
      const sides = parseInt(diceMatch[2])
      // Strip sign from count string — signs on dice terms are for ordering, not count
      const absCountStr = countStr.replace(/^[+-]/, '')
      const count = absCountStr ? parseInt(absCountStr) : 1
      dice.push({ count, sides })
    } else {
      modifier += parseInt(token)
    }
  }

  return { dice, modifier }
}

/**
 * Roll a dice formula and return a structured Roll result.
 */
export function rollDice(formula: string, label?: string): Roll {
  const parsed = parseFormula(formula)
  const diceEntries: DiceEntry[] = []

  for (const { count, sides } of parsed.dice) {
    for (let i = 0; i < count; i++) {
      diceEntries.push({
        sides,
        value: Math.floor(Math.random() * sides) + 1,
      })
    }
  }

  const total = diceEntries.reduce((sum, d) => sum + d.value, 0) + parsed.modifier

  return {
    id: crypto.randomUUID(),
    formula,
    dice: diceEntries,
    modifier: parsed.modifier,
    total,
    label,
    timestamp: Date.now(),
  }
}

/**
 * Compute the heightened formula for a spell at a given cast rank.
 * Returns the base formula unchanged if castRank <= baseRank.
 *
 * @example
 * heightenFormula('6d6', { perRanks: 1, add: '2d6' }, 5, 3) // '6d6+2d6+2d6'
 * heightenFormula('6d6', { perRanks: 1, add: '2d6' }, 3, 3) // '6d6'
 */
export function heightenFormula(
  base: string,
  heightened: { perRanks: number; add: string },
  castRank: number,
  baseRank: number,
): string {
  if (castRank <= baseRank) return base

  const increments = Math.floor((castRank - baseRank) / heightened.perRanks)
  if (increments <= 0) return base

  let result = base
  for (let i = 0; i < increments; i++) {
    result = result + '+' + heightened.add
  }
  return result
}
