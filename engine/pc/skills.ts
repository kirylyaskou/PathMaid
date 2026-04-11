import type { PathbuilderAbilities } from './types'

/** PF2e skill → governing ability mapping (rules-hardcoded) */
export const SKILL_ABILITY: Record<string, keyof PathbuilderAbilities> = {
  acrobatics: 'dex', arcana: 'int', athletics: 'str', crafting: 'int',
  deception: 'cha', diplomacy: 'cha', intimidation: 'cha',
  medicine: 'wis', nature: 'wis', occultism: 'int', performance: 'cha',
  religion: 'wis', society: 'int', stealth: 'dex', survival: 'wis',
  thievery: 'dex',
}
