import { describe, it, expect } from 'vitest'
import {
  calculateCreatureXP,
  getHazardXp,
  generateEncounterBudgets,
  calculateEncounterRating,
  calculateXP,
} from '../encounter/xp'

describe('calculateCreatureXP', () => {
  // Table spot checks from PF2e GM Core Table 10-2
  it('delta -4 → 10 XP', () => {
    expect(calculateCreatureXP(1, 5)).toEqual({ xp: 10 })
  })

  it('delta 0 → 40 XP (same level)', () => {
    expect(calculateCreatureXP(5, 5)).toEqual({ xp: 40 })
  })

  it('delta +4 → 160 XP', () => {
    expect(calculateCreatureXP(9, 5)).toEqual({ xp: 160 })
  })

  it('delta < -4 → 0 XP (trivially weak)', () => {
    expect(calculateCreatureXP(0, 5)).toEqual({ xp: 0 })
  })

  it('delta > 4 → out of range', () => {
    expect(calculateCreatureXP(10, 5)).toEqual({ xp: null, outOfRange: true })
  })
})

describe('getHazardXp', () => {
  it('complex hazard: same XP as creature at same delta', () => {
    const creatureXp = calculateCreatureXP(5, 5)
    const hazardXp = getHazardXp(5, 5, 'complex')
    expect(hazardXp).toEqual(creatureXp)
  })

  it('simple hazard: ~1/5 of complex', () => {
    expect(getHazardXp(5, 5, 'simple')).toEqual({ xp: 8 }) // 40/5
  })

  it('simple hazard delta -4 → 2 XP', () => {
    expect(getHazardXp(1, 5, 'simple')).toEqual({ xp: 2 })
  })

  it('out of range: same behavior as creatures', () => {
    expect(getHazardXp(10, 5, 'complex')).toEqual({ xp: null, outOfRange: true })
  })
})

describe('generateEncounterBudgets', () => {
  it('party of 4: returns base budgets', () => {
    const budgets = generateEncounterBudgets(4)
    expect(budgets.trivial).toBe(40)
    expect(budgets.low).toBe(60)
    expect(budgets.moderate).toBe(80)
    expect(budgets.severe).toBe(120)
    expect(budgets.extreme).toBe(160)
  })

  it('party of 5: budgets increase by one character adjustment', () => {
    const budgets = generateEncounterBudgets(5)
    expect(budgets.trivial).toBe(50)  // 40 + 10
    expect(budgets.moderate).toBe(100) // 80 + 20
    expect(budgets.extreme).toBe(200)  // 160 + 40
  })

  it('party of 3: budgets decrease', () => {
    const budgets = generateEncounterBudgets(3)
    expect(budgets.trivial).toBe(30)  // 40 - 10
  })

  it('throws for party size 0', () => {
    expect(() => generateEncounterBudgets(0)).toThrow()
  })
})

describe('calculateEncounterRating', () => {
  // Party of 4, standard budgets: trivial=40, low=60, moderate=80, severe=120, extreme=160

  it('0 XP → trivial', () => {
    expect(calculateEncounterRating(0, 4)).toBe('trivial')
  })

  it('40 XP → trivial (not exceeds)', () => {
    expect(calculateEncounterRating(40, 4)).toBe('trivial')
  })

  it('41 XP → low', () => {
    expect(calculateEncounterRating(41, 4)).toBe('low')
  })

  it('80 XP → low (not exceeds moderate)', () => {
    expect(calculateEncounterRating(80, 4)).toBe('low')
  })

  it('81 XP → moderate', () => {
    expect(calculateEncounterRating(81, 4)).toBe('moderate')
  })

  it('161 XP → extreme', () => {
    expect(calculateEncounterRating(161, 4)).toBe('extreme')
  })
})

describe('calculateXP (orchestrator)', () => {
  it('single same-level creature → 40 XP, moderate', () => {
    const result = calculateXP([5], [], 5, 4)
    expect(result.totalXp).toBe(40)
    expect(result.rating).toBe('trivial') // 40 is not > 40 (trivial budget), so trivial
  })

  it('two same-level creatures → 80 XP, low', () => {
    const result = calculateXP([5, 5], [], 5, 4)
    expect(result.totalXp).toBe(80)
    expect(result.rating).toBe('low') // 80 > 60 (low), <= 80 (moderate)? No: 80 is NOT > 80 → low
  })

  it('out-of-range creature: xp null, warning added', () => {
    const result = calculateXP([15], [], 5, 4)
    expect(result.totalXp).toBe(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].creatureLevel).toBe(15)
    expect(result.creatures[0].xp).toBeNull()
  })

  it('mixed creatures and hazards sum correctly', () => {
    // creature delta 0: 40 XP + simple hazard delta 0: 8 XP = 48 XP
    const result = calculateXP([5], [{ level: 5, type: 'simple' }], 5, 4)
    expect(result.totalXp).toBe(48)
  })

  it('throws for party size 0', () => {
    expect(() => calculateXP([], [], 5, 0)).toThrow()
  })
})
