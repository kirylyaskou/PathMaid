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
  source?: string             // who made the roll, e.g. creature/combatant name
  combatId?: string           // which combat session (encounter tab id)
  timestamp: number           // Date.now()
  /** 65-05: optional roll-time notes attached by Note rule elements. */
  notes?: string[]
  /** Optional human-readable math breakdown (e.g. "(2 + 5) × 2 = 14"). When set,
   *  UI replaces the default "dice + modifier = total" line with this string. */
  breakdown?: string
  /**
   * v1.4.1 UAT BUG-B: when a fortune / misfortune effect rolls the d20 twice
   * independently, the primary Roll carries the CHOSEN result (higher for
   * fortune, lower for misfortune) and this field describes the pair so the
   * UI can render "Roll 1: …  Roll 2: …  ← chosen".
   *
   * Each entry is a fully self-contained d20 outcome: its own die value, its
   * own modifier-adjusted total, and its own crit/fumble eligibility (a nat
   * 20 on either roll is still a crit candidate per PF2e).
   *
   * Omitted for normal single rolls to keep the legacy toast unchanged.
   */
  fortune?: FortuneRollDisplay
}

/**
 * v1.4.1 UAT BUG-B: dual-roll representation for fortune / misfortune. The
 * engine guarantees `rolls.length === 2`; the chosen index is 0 or 1.
 */
export interface FortuneRollDisplay {
  kind: 'fortune' | 'misfortune'
  rolls: [FortuneRollEntry, FortuneRollEntry]
  /** Index (0 or 1) of the chosen roll per the fortune/misfortune rule. */
  chosen: 0 | 1
}

export interface FortuneRollEntry {
  /** The d20 face rolled (1–20). */
  d20: number
  /** Flat modifier portion applied to this roll. */
  modifier: number
  /** `d20 + modifier`. */
  total: number
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
export function rollDice(
  formula: string,
  label?: string,
  context?: { source?: string; combatId?: string; notes?: string[] },
): Roll {
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
    source: context?.source,
    combatId: context?.combatId,
    timestamp: Date.now(),
    notes: context?.notes,
  }
}

/**
 * Merge a `+`-joined damage expression into canonical form.
 * Sums dice of the same die size and combines flat modifiers.
 *
 * @example
 * mergeDamageExpression('6d6+2d6+2d6')       // '10d6'
 * mergeDamageExpression('6d6+4+2d6+2d6')     // '10d6+4'
 * mergeDamageExpression('2d8+4+1d6+2d6')     // '2d8+3d6+4'
 *
 * Falls back to the input untouched if any part can't be parsed
 * (e.g. contains subtraction, parentheses, or math beyond NdS / flat ints).
 */
function mergeDamageExpression(expr: string): string {
  const parts = expr.split('+').map((p) => p.trim()).filter(Boolean)
  const diceBySize: Record<number, number> = {}
  let flatTotal = 0
  for (const part of parts) {
    const m = /^(\d+)d(\d+)$/.exec(part)
    if (m) {
      const count = parseInt(m[1], 10)
      const size = parseInt(m[2], 10)
      diceBySize[size] = (diceBySize[size] ?? 0) + count
      continue
    }
    const flat = Number(part)
    if (!Number.isNaN(flat)) {
      flatTotal += flat
      continue
    }
    // Unparseable fragment (e.g. math operator other than +) — abort and return input.
    return expr
  }
  const sizes = Object.keys(diceBySize).map(Number).sort((a, b) => b - a) // larger dice first
  const out = sizes.map((s) => `${diceBySize[s]}d${s}`)
  if (flatTotal !== 0) out.push(String(flatTotal))
  return out.join('+') || expr
}

/**
 * Compute the heightened formula for a spell at a given cast rank.
 * Returns the base formula unchanged if castRank <= baseRank.
 *
 * Result is rendered in canonical form: same-die-size dice are summed
 * and flat modifiers are combined.
 *
 * @example
 * heightenFormula('6d6', { perRanks: 1, add: '2d6' }, 5, 3) // '10d6'
 * heightenFormula('6d6', { perRanks: 1, add: '2d6' }, 8, 3) // '16d6'
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

  const raw = [base, ...Array<string>(increments).fill(heightened.add)].join('+')
  return mergeDamageExpression(raw)
}
