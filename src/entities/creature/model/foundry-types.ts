/** Partial typing for Foundry VTT creature JSON — covers only fields read by mappers.ts */

export interface FoundryIwrEntry {
  type: string
  value?: number
}

export interface FoundryOtherSpeed {
  type: string
  value: number
}

export interface FoundryDamageRoll {
  damage?: string
  formula?: string
  damageType?: string
  type?: string
}

export interface FoundryItemSystem {
  bonus?: { value?: number }
  damageRolls?: Record<string, FoundryDamageRoll>
  traits?: { value?: string[] }
  description?: { value?: string }
  actionType?: { value?: string }
  actions?: { value?: number | null }
  group?: string
}

export interface FoundryItem {
  _id: string
  name: string
  type: string
  flags?: { pf2e?: { linkedWeapon?: string } }
  system?: FoundryItemSystem
}

export interface FoundrySkillEntry {
  base?: number
}

export interface FoundrySenseEntry {
  type?: string
}

export interface FoundrySystem {
  attributes?: {
    immunities?: FoundryIwrEntry[]
    weaknesses?: FoundryIwrEntry[]
    resistances?: FoundryIwrEntry[]
    speed?: {
      value?: number
      otherSpeeds?: FoundryOtherSpeed[] | Record<string, { value?: number }>
    }
    spellDC?: { value?: number }
    classOrSpellDC?: { value?: number }
  }
  saves?: {
    fortitude?: { value: number }
    reflex?: { value: number }
    will?: { value: number }
  }
  details?: {
    publicNotes?: string
    description?: { value?: string }
    languages?: { value?: string[] }
    publication?: { title?: string }
    source?: { value?: string }
  }
  traits?: {
    languages?: { value?: string[] }
    senses?: Array<FoundrySenseEntry | string>
  }
  skills?: Record<string, FoundrySkillEntry>
  perception?: { senses?: Array<FoundrySenseEntry | string> }
  proficiencies?: { classDC?: { totalModifier?: number } }
  spellcasting?: { dc?: { value?: number } }
}
