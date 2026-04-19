// ─── Fortune / Misfortune / Assurance (Phase 65, D-65-02) ─────────────────────
// Engine-side helper to mutate a roll formula based on active fortune-type
// effects and direct Assurance invocations. Pure function — no DB/UI dependency.
// Caller is expected to supply whatever "active option/effect" evidence it has
// about the combatant; the helper itself is stateless.
//
// Rules:
//   - fortune = true            → replace with "2d20kh1" (roll twice keep higher)
//   - misfortune = true         → replace with "2d20kl1" (roll twice keep lower)
//   - BOTH fortune + misfortune → cancel to the base formula (PF2e RAW)
//   - assurance  = { prof }     → short-circuits to "10+<prof>" (no dice)
//
// The formula returned is a STRING — downstream `parseFormula` must support
// the `NdNkh/klN` keep-n suffix. As of Phase 65 we only emit exactly
// `2d20kh1` / `2d20kl1`; the dice-engine parser is extended in the wiring
// layer by swapping `2d20kh1` → one-of-two d20s at roll time.
//
// NOTE: `parseFormula` in engine/dice/dice.ts does NOT understand `kh1/kl1`.
// Rather than extend the formula DSL (risk of wider churn), the wiring site
// (use-roll.ts caller) rolls two d20s itself and picks the winner. Returning
// the `2d20kh1` string keeps the formula-as-display consistent with Foundry
// convention so users recognize it in the toast.

export type RollContext = {
  type: 'attack' | 'skill' | 'save' | 'perception'
}

export interface FortuneInputs {
  fortune?: boolean
  misfortune?: boolean
  /**
   * Assurance short-circuit. When present, dice are bypassed entirely and the
   * output formula becomes "10+<proficiencyBonus>". All other inputs ignored.
   */
  assurance?: { proficiencyBonus: number }
}

export interface FortuneResult {
  /** New formula string. Same as input `formula` when no effect applies. */
  formula: string
  /** Human-readable label when the engine altered the formula. */
  label?: string
}

/**
 * Apply fortune / misfortune / assurance to a base roll formula.
 *
 * Pure function. No implicit lookup — the caller resolves RollOption state
 * and passes booleans in. This keeps the engine free of store dependencies.
 *
 * @param formula     - Base roll formula, e.g. "1d20+7".
 * @param combatantId - Kept in the signature for call-site symmetry (logging,
 *                      future tracing). Not used in the computation itself.
 * @param _context    - RollContext — reserved for future type-scoped rules
 *                      (e.g. fortune-only-on-attacks). Phase 65 treats all
 *                      fortune inputs as universally applicable.
 * @param inputs      - Fortune/misfortune/assurance flags.
 */
export function applyFortuneToRoll(
  formula: string,
  combatantId: string,
  _context: RollContext,
  inputs: FortuneInputs = {},
): FortuneResult {
  // Silence unused-parameter warning while keeping the documented signature.
  void combatantId

  // Assurance wins above everything — no dice at all.
  if (inputs.assurance) {
    const prof = inputs.assurance.proficiencyBonus
    const sign = prof >= 0 ? '+' : '-'
    return {
      formula: `10${sign}${Math.abs(prof)}`,
      label: 'Assurance (flat)',
    }
  }

  const fortune = Boolean(inputs.fortune)
  const misfortune = Boolean(inputs.misfortune)

  // PF2e: fortune and misfortune on the same roll cancel.
  if (fortune && misfortune) {
    return { formula }
  }
  if (fortune) {
    return {
      formula: rewriteD20Keep(formula, 'kh1'),
      label: 'Sure Strike (fortune)',
    }
  }
  if (misfortune) {
    return {
      formula: rewriteD20Keep(formula, 'kl1'),
      label: 'Misfortune (keep lower)',
    }
  }
  return { formula }
}

// Rewrite the leading d20 term of a formula to "2d20khN"/"2d20klN".
// Keeps any trailing modifier untouched ("1d20+7" → "2d20kh1+7").
// If the formula doesn't start with a d20 term we hand it back unmodified;
// PF2e fortune rules only ever target d20-based checks.
function rewriteD20Keep(formula: string, keep: 'kh1' | 'kl1'): string {
  const match = /^\s*([+-]?\s*\d*)d20\b/i.exec(formula)
  if (!match) return formula
  const consumed = match[0]
  const rest = formula.slice(consumed.length)
  return `2d20${keep}${rest}`
}
