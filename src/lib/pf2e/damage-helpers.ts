// ─── Damage Helpers (DMG-04, DMG-05) ────────────────────────────────────────
// Source: Wraps constants from ./damage to provide query API for damage categorization
// and die size stepping. Used by Phase 05 IWR Engine.

import {
  DAMAGE_TYPE_CATEGORY,
  PHYSICAL_DAMAGE_TYPES,
  ENERGY_DAMAGE_TYPES,
  OTHER_DAMAGE_TYPES,
  DIE_FACES,
} from './damage'
import type { DamageType, DamageCategory, DieFace } from './damage'

// ─── DamageCategorization (DMG-04) ──────────────────────────────────────────

const CATEGORY_TO_TYPES: Record<DamageCategory, readonly DamageType[]> = {
  physical: PHYSICAL_DAMAGE_TYPES,
  energy: ENERGY_DAMAGE_TYPES,
  other: OTHER_DAMAGE_TYPES,
}

/** Utility for mapping damage types to/from their PF2e categories. */
export const DamageCategorization = {
  /** Maps a damage type to its PF2e category (physical/energy/other). */
  getCategory(type: DamageType): DamageCategory {
    return DAMAGE_TYPE_CATEGORY[type]
  },
  /** Returns all damage types belonging to the given category. */
  getTypes(category: DamageCategory): readonly DamageType[] {
    return CATEGORY_TO_TYPES[category]
  },
} as const

// ─── nextDamageDieSize (DMG-05) ─────────────────────────────────────────────

/**
 * Steps a die size up (+1) or down (-1) through the d4->d6->d8->d10->d12 progression.
 * Caps at boundaries: stepping down from d4 returns d4; stepping up from d12 returns d12.
 */
export function nextDamageDieSize(current: DieFace, direction: 1 | -1): DieFace {
  const index = DIE_FACES.indexOf(current)
  const next = Math.max(0, Math.min(DIE_FACES.length - 1, index + direction))
  return DIE_FACES[next]
}
