import type { WeakEliteTier } from '../types'
import { getStatAdjustment, getDamageAdjustment } from './weak-elite'

// ─── Damage formula adjustment ────────────────────────────────────────────────

/**
 * Shift the constant term of a PF2e damage formula by a signed delta.
 *
 * Supports the dice-only and dice+constant shapes emitted by the Foundry
 * damage-roll serialiser:
 *   - "1d6"        -> "1d6+2"    (delta=+2)
 *   - "2d8+4"      -> "2d8+6"    (delta=+2)
 *   - "1d10-1"     -> "1d10+1"   (delta=+2)
 *   - "1d4"        -> "1d4"      (delta=-2, clamped to no-op when result < 1 dice+const)
 *
 * Negative totals are clamped so we never emit "NdM-3" etc. The minimum
 * post-adjustment constant is 0 (dice-only) — PF2e never reports negative
 * damage; an unavoidable floor of 1 is enforced at roll time, not here.
 *
 * If the formula can't be parsed (e.g. "flat 3", "2d6 + 1d4"), the original
 * string is returned untouched. Strike-damage is split into multiple entries
 * at the mapper layer, so the "main damage only" rule from
 * `applyTierToStatBlock` keeps this helper safe to use on per-entry formulas.
 */
export function shiftDamageFormulaConstant(formula: string, delta: number): string {
  if (delta === 0) return formula
  const match = /^(\d+d\d+)([+\-]\d+)?(.*)$/.exec(formula.trim())
  if (!match) return formula
  const [, dice, constPart, tail] = match
  const existing = constPart ? parseInt(constPart, 10) : 0
  const total = existing + delta
  const rest = tail ?? ''
  if (total === 0) return `${dice}${rest}`
  if (total > 0) return `${dice}+${total}${rest}`
  // Clamp: PF2e damage never goes negative. Treat as dice-only.
  return `${dice}${rest}`
}

// ─── Stat block transformer ───────────────────────────────────────────────────

// Narrow structural types matching the bits of CreatureStatBlockData we adjust.
// Defined here (not imported from src/) so the engine stays decoupled from
// the UI layer — consumers pass the appropriate shape.
interface TierDamageEntry { formula: string; type: string; label?: string }
interface TierStrike {
  name: string
  modifier: number
  damage: TierDamageEntry[]
  additionalDamage?: TierDamageEntry[]
  traits: string[]
  group?: string
  reach?: number
  range?: number
}
interface TierSkill { name: string; modifier: number; calculated?: boolean }
interface TierSpellcastingAttack {
  entryId: string
  attack?: number | null
  dc?: number | null
}

export interface TierAdjustableStatBlock {
  ac: number
  fort: number
  ref: number
  will: number
  perception: number
  strikes: TierStrike[]
  skills: TierSkill[]
  spellDC?: number | undefined
  classDC?: number | undefined
  spellcasting?: TierSpellcastingAttack[] | undefined
}

/**
 * Return a new stat-block object with Elite/Weak tier adjustments applied
 * (Monster Core pg. 6-7). Pure; input is not mutated.
 *
 * - AC, saves (fort/ref/will), perception, skill mods, strike attack mods,
 *   spellcasting attack/DC: ±2.
 * - Strike damage (main entry only): shift constant term by ±2 via
 *   `shiftDamageFormulaConstant`. Additional damage entries (persistent,
 *   rider damage) are left untouched — per PF2e the tier modifier only
 *   applies to the weapon's own damage roll.
 * - Limited-use abilities (±4 damage) are NOT auto-detected in v1.4 — a
 *   v1.5 follow-up will inspect `abilities[].description` for
 *   "Frequency: once per ...". For now Strike/ability damage always uses
 *   the ±2 variant.
 * - HP is deliberately skipped — the combat pipeline already bakes the
 *   HP delta into the combatant at add-time via `getHpAdjustment`.
 *   Double-application would compound the adjustment.
 */
export function applyTierToStatBlock<T extends TierAdjustableStatBlock>(
  sb: T,
  tier: WeakEliteTier,
): T {
  if (tier === 'normal') return sb
  const statDelta = getStatAdjustment(tier)
  const damageDelta = getDamageAdjustment(tier, false)

  const adjustedStrikes: TierStrike[] = sb.strikes.map((s) => ({
    ...s,
    modifier: s.modifier + statDelta,
    damage: s.damage.map((d, i) =>
      i === 0 ? { ...d, formula: shiftDamageFormulaConstant(d.formula, damageDelta) } : d,
    ),
    // additionalDamage left untouched (persistent / rider damage not affected).
  }))

  const adjustedSkills: TierSkill[] = sb.skills.map((sk) => ({
    ...sk,
    modifier: sk.modifier + statDelta,
  }))

  const adjustedSpellcasting = sb.spellcasting?.map((sc) => ({
    ...sc,
    ...(sc.attack != null ? { attack: sc.attack + statDelta } : {}),
    ...(sc.dc != null ? { dc: sc.dc + statDelta } : {}),
  }))

  return {
    ...sb,
    ac: sb.ac + statDelta,
    fort: sb.fort + statDelta,
    ref: sb.ref + statDelta,
    will: sb.will + statDelta,
    perception: sb.perception + statDelta,
    strikes: adjustedStrikes,
    skills: adjustedSkills,
    ...(sb.spellDC != null ? { spellDC: sb.spellDC + statDelta } : {}),
    ...(sb.classDC != null ? { classDC: sb.classDC + statDelta } : {}),
    ...(adjustedSpellcasting ? { spellcasting: adjustedSpellcasting } : {}),
  }
}
