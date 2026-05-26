import type { CustomItemInput } from '@/shared/api'

export type CustomItemBuilderState = CustomItemInput

export type CustomItemRuleDraft =
  | { kind: 'resistance'; damageType: string; value: number }
  | { kind: 'flatModifier'; selector: string; modifierType: 'item' | 'status' | 'circumstance' | 'untyped'; value: number }
  | { kind: 'abilityModDelta'; ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'; value: number }
  | { kind: 'grantAbility'; name: string; actionCost?: 0 | 1 | 2 | 3 | 'reaction' | 'free'; description: string; traits?: string[] }
  | {
      kind: 'grantSpell'
      name: string
      rank: number
      tradition: string
      castType?: 'innate' | 'prepared' | 'spontaneous' | 'focus'
      foundryId?: string | null
      spellDc?: number
      spellAttack?: number
      frequency?: { kind: 'at-will' } | { kind: 'per'; max: number; per: 'day' | 'hour' | 'round' }
    }
