import type { DieFace, DamageType, DamageCategory, CriticalInclusion } from './damage'

// ─── Modifier Types ───────────────────────────────────────────────────────────
// Source: PF2e Player Core / GM Core (https://2e.aonprd.com/Rules.aspx?ID=22)
export const MODIFIER_TYPES = [
  'ability', 'circumstance', 'item', 'potency',
  'proficiency', 'status', 'untyped',
] as const
export type ModifierType = (typeof MODIFIER_TYPES)[number]

// ─── Modifier Class (MOD-01) ──────────────────────────────────────────────────
interface ModifierParams {
  slug: string
  label: string
  modifier: number
  type: ModifierType
  enabled?: boolean
}

export class Modifier {
  slug: string
  label: string
  modifier: number
  type: ModifierType
  enabled: boolean

  constructor({ slug, label, modifier, type, enabled = true }: ModifierParams) {
    this.slug = slug
    this.label = label
    this.modifier = modifier
    this.type = type
    this.enabled = enabled
  }
}

// ─── Stacking Rules (MOD-02) ──────────────────────────────────────────────────
// Source: PF2e Player Core / GM Core (https://2e.aonprd.com/Rules.aspx?ID=22)
// Typed modifiers: only highest bonus and lowest penalty per type apply.
// Untyped modifiers: all stack (both bonuses and penalties).
export function applyStackingRules(modifiers: Modifier[]): void {
  const highestBonusByType = new Map<ModifierType, Modifier>()
  const lowestPenaltyByType = new Map<ModifierType, Modifier>()

  for (const modifier of modifiers) {
    if (!modifier.enabled) continue          // skip pre-disabled
    if (modifier.type === 'untyped') continue  // untyped always stack

    if (modifier.modifier >= 0) {
      // bonus bucket: keep highest per type
      const current = highestBonusByType.get(modifier.type)
      if (current === undefined || modifier.modifier > current.modifier) {
        if (current) current.enabled = false
        highestBonusByType.set(modifier.type, modifier)
      } else {
        modifier.enabled = false
      }
    } else {
      // penalty bucket: keep lowest (most negative) per type
      const current = lowestPenaltyByType.get(modifier.type)
      if (current === undefined || modifier.modifier < current.modifier) {
        if (current) current.enabled = false
        lowestPenaltyByType.set(modifier.type, modifier)
      } else {
        modifier.enabled = false
      }
    }
  }
}

// ─── StatisticModifier (MOD-03) ───────────────────────────────────────────────
export class StatisticModifier {
  slug: string
  label: string
  modifiers: Modifier[]
  totalModifier: number

  constructor(slug: string, modifiers: Modifier[], label?: string) {
    this.slug = slug
    this.label = label ?? slug
    this.modifiers = [...modifiers]
    applyStackingRules(this.modifiers)
    this.totalModifier = this.modifiers
      .filter(m => m.enabled)
      .reduce((sum, m) => sum + m.modifier, 0)
  }
}

// ─── DamageDicePF2e (MOD-04) ─────────────────────────────────────────────────
interface DamageDiceParams {
  slug: string
  label: string
  diceNumber: number
  dieSize: DieFace
  damageType: DamageType
  category: DamageCategory
  critical: CriticalInclusion
  enabled?: boolean
}

export class DamageDicePF2e {
  slug: string
  label: string
  diceNumber: number
  dieSize: DieFace
  damageType: DamageType
  category: DamageCategory
  critical: CriticalInclusion
  enabled: boolean

  constructor({ slug, label, diceNumber, dieSize, damageType, category, critical, enabled = true }: DamageDiceParams) {
    this.slug = slug
    this.label = label
    this.diceNumber = diceNumber
    this.dieSize = dieSize
    this.damageType = damageType
    this.category = category
    this.critical = critical
    this.enabled = enabled
  }
}
