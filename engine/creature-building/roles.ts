// engine/creature-building/roles.ts
//
// PF2e creature roles. Per-save and per-ability tier granularity (D-29).
// Source: Dosexe/pf2e-creature-builder RoadMaps (MIT License),
// cross-verified with AoN Building Creatures Role descriptions (ID 2910 et al.).

import type { RoleId, RolePreset, Tier } from './types'
import { getBenchmark } from './getBenchmark'

export const ROLE_PRESETS: Record<RoleId, RolePreset> = {
  brute: {
    perception: 'low',
    abilities: { str: 'high' },  // other abilities left unassigned
    ac: 'low',
    saves: { fort: 'high', ref: 'low', will: 'low' },
    hp: 'high',
    strikeAttackBonus: 'high',
    strikeDamage: 'high',
  },
  soldier: {
    perception: 'moderate',
    abilities: { str: 'moderate', dex: 'moderate' },
    ac: 'high',
    saves: { fort: 'high', ref: 'moderate', will: 'moderate' },
    hp: 'moderate',
    strikeAttackBonus: 'high',
    strikeDamage: 'moderate',
  },
  skirmisher: {
    perception: 'high',
    abilities: { dex: 'high' },
    ac: 'high',
    saves: { fort: 'moderate', ref: 'high', will: 'moderate' },
    hp: 'moderate',
    strikeAttackBonus: 'high',
    strikeDamage: 'moderate',
  },
  sniper: {
    perception: 'high',
    abilities: { dex: 'extreme' },
    ac: 'moderate',
    saves: { fort: 'moderate', ref: 'high', will: 'moderate' },
    hp: 'low',
    strikeAttackBonus: 'extreme',
    strikeDamage: 'moderate',
  },
  spellcaster: {
    perception: 'moderate',
    abilities: { int: 'high', wis: 'high', cha: 'high' },
    ac: 'low',
    saves: { fort: 'low', ref: 'moderate', will: 'high' },
    hp: 'low',
    strikeAttackBonus: 'low',
    strikeDamage: 'low',
    spellDC: 'extreme',
    spellAttack: 'extreme',
  },
  skillParagon: {
    perception: 'high',
    abilities: { str: 'high', dex: 'high', int: 'high' },
    ac: 'moderate',
    saves: { fort: 'low', ref: 'high', will: 'high' },
    hp: 'moderate',
    strikeAttackBonus: 'moderate',
    strikeDamage: 'moderate',
    skill: 'high',
  },
  magicalStriker: {
    perception: 'moderate',
    abilities: { dex: 'high' },
    ac: 'moderate',
    saves: { fort: 'moderate', ref: 'moderate', will: 'moderate' },
    hp: 'moderate',
    strikeAttackBonus: 'high',
    strikeDamage: 'moderate',
    spellDC: 'moderate',
    spellAttack: 'moderate',
  },
}

// Computed-values output of applyRole — all numeric, ready to splat into form state.
// Consumers (UI-SPEC Apply-role confirm modal) render these via getBenchmark at display time.
export interface AppliedRoleValues {
  abilityMods: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
  fort?: number
  ref?: number
  will?: number
  perception?: number
  ac?: number
  hp?: number
  strikeAttackBonus?: number
  strikeDamage?: { formula: string; expected: number }
  spellDC?: number
  spellAttack?: number
  skill?: number
}

export function applyRole(roleId: RoleId, level: number): AppliedRoleValues {
  const preset = ROLE_PRESETS[roleId]
  const out: AppliedRoleValues = { abilityMods: {} }
  if (preset.abilities) {
    for (const [k, t] of Object.entries(preset.abilities) as Array<
      [keyof NonNullable<RolePreset['abilities']>, Tier]
    >) {
      out.abilityMods[k] = getBenchmark('abilityMod', level, t)
    }
  }
  if (preset.saves?.fort) out.fort = getBenchmark('save', level, preset.saves.fort)
  if (preset.saves?.ref) out.ref = getBenchmark('save', level, preset.saves.ref)
  if (preset.saves?.will) out.will = getBenchmark('save', level, preset.saves.will)
  if (preset.perception) out.perception = getBenchmark('perception', level, preset.perception)
  if (preset.ac) out.ac = getBenchmark('ac', level, preset.ac)
  if (preset.hp) out.hp = getBenchmark('hp', level, preset.hp)
  if (preset.strikeAttackBonus) out.strikeAttackBonus = getBenchmark('attackBonus', level, preset.strikeAttackBonus)
  if (preset.strikeDamage) out.strikeDamage = getBenchmark('strikeDamage', level, preset.strikeDamage)
  if (preset.spellDC) out.spellDC = getBenchmark('spellDC', level, preset.spellDC)
  if (preset.spellAttack) out.spellAttack = getBenchmark('spellAttack', level, preset.spellAttack)
  if (preset.skill) out.skill = getBenchmark('skill', level, preset.skill)
  return out
}
