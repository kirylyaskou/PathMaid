import type { CreatureStatBlockData } from '@/entities/creature/model/types'

export interface BuilderState {
  form: CreatureStatBlockData
}

// Individual-field patch actions keep intent explicit and deep-update safe.
// All action types are string-literal discriminated for exhaustive switching.
export type BuilderAction =
  | { type: 'REPLACE_ALL'; form: CreatureStatBlockData }
  | { type: 'SET_FIELD'; path: keyof CreatureStatBlockData; value: unknown }
  | { type: 'SET_ABILITY_MOD'; key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'; value: number }
  | { type: 'SET_SPEED'; key: string; value: number | null }
  | { type: 'REMOVE_SPEED'; key: string }
  | { type: 'ADD_STRIKE'; strike: CreatureStatBlockData['strikes'][number] }
  | { type: 'UPDATE_STRIKE'; index: number; strike: CreatureStatBlockData['strikes'][number] }
  | { type: 'REMOVE_STRIKE'; index: number }
  | { type: 'ADD_ABILITY'; ability: CreatureStatBlockData['abilities'][number] }
  | { type: 'UPDATE_ABILITY'; index: number; ability: CreatureStatBlockData['abilities'][number] }
  | { type: 'REMOVE_ABILITY'; index: number }
  | { type: 'ADD_IMMUNITY'; entry: CreatureStatBlockData['immunities'][number] }
  | { type: 'REMOVE_IMMUNITY'; index: number }
  | { type: 'ADD_WEAKNESS'; entry: CreatureStatBlockData['weaknesses'][number] }
  | { type: 'UPDATE_WEAKNESS'; index: number; entry: CreatureStatBlockData['weaknesses'][number] }
  | { type: 'REMOVE_WEAKNESS'; index: number }
  | { type: 'ADD_RESISTANCE'; entry: CreatureStatBlockData['resistances'][number] }
  | { type: 'UPDATE_RESISTANCE'; index: number; entry: CreatureStatBlockData['resistances'][number] }
  | { type: 'REMOVE_RESISTANCE'; index: number }
  | { type: 'ADD_AURA'; entry: NonNullable<CreatureStatBlockData['auras']>[number] }
  | { type: 'UPDATE_AURA'; index: number; entry: NonNullable<CreatureStatBlockData['auras']>[number] }
  | { type: 'REMOVE_AURA'; index: number }
  | { type: 'ADD_RITUAL'; entry: NonNullable<CreatureStatBlockData['rituals']>[number] }
  | { type: 'UPDATE_RITUAL'; index: number; entry: NonNullable<CreatureStatBlockData['rituals']>[number] }
  | { type: 'REMOVE_RITUAL'; index: number }
  | { type: 'ADD_SKILL'; entry: CreatureStatBlockData['skills'][number] }
  | { type: 'UPDATE_SKILL'; index: number; entry: CreatureStatBlockData['skills'][number] }
  | { type: 'REMOVE_SKILL'; index: number }
  | { type: 'ADD_SPELLCASTING_ENTRY'; entry: NonNullable<CreatureStatBlockData['spellcasting']>[number] }
  | { type: 'UPDATE_SPELLCASTING_ENTRY'; index: number; entry: NonNullable<CreatureStatBlockData['spellcasting']>[number] }
  | { type: 'REMOVE_SPELLCASTING_ENTRY'; index: number }

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'REPLACE_ALL':
      return { form: action.form }
    case 'SET_FIELD':
      return { form: { ...state.form, [action.path]: action.value } as CreatureStatBlockData }
    case 'SET_ABILITY_MOD':
      return {
        form: {
          ...state.form,
          abilityMods: { ...state.form.abilityMods, [action.key]: action.value },
        },
      }
    case 'SET_SPEED':
      return {
        form: {
          ...state.form,
          speeds: { ...state.form.speeds, [action.key]: action.value },
        },
      }
    case 'REMOVE_SPEED': {
      const next = { ...state.form.speeds }
      delete next[action.key]
      return { form: { ...state.form, speeds: next } }
    }
    case 'ADD_STRIKE':
      return { form: { ...state.form, strikes: [...state.form.strikes, action.strike] } }
    case 'UPDATE_STRIKE':
      return {
        form: {
          ...state.form,
          strikes: state.form.strikes.map((s, i) => (i === action.index ? action.strike : s)),
        },
      }
    case 'REMOVE_STRIKE':
      return {
        form: {
          ...state.form,
          strikes: state.form.strikes.filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_ABILITY':
      return {
        form: { ...state.form, abilities: [...state.form.abilities, action.ability] },
      }
    case 'UPDATE_ABILITY':
      return {
        form: {
          ...state.form,
          abilities: state.form.abilities.map((a, i) => (i === action.index ? action.ability : a)),
        },
      }
    case 'REMOVE_ABILITY':
      return {
        form: {
          ...state.form,
          abilities: state.form.abilities.filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_IMMUNITY':
      return {
        form: { ...state.form, immunities: [...state.form.immunities, action.entry] },
      }
    case 'REMOVE_IMMUNITY':
      return {
        form: {
          ...state.form,
          immunities: state.form.immunities.filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_WEAKNESS':
      return {
        form: { ...state.form, weaknesses: [...state.form.weaknesses, action.entry] },
      }
    case 'UPDATE_WEAKNESS':
      return {
        form: {
          ...state.form,
          weaknesses: state.form.weaknesses.map((w, i) => (i === action.index ? action.entry : w)),
        },
      }
    case 'REMOVE_WEAKNESS':
      return {
        form: {
          ...state.form,
          weaknesses: state.form.weaknesses.filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_RESISTANCE':
      return {
        form: { ...state.form, resistances: [...state.form.resistances, action.entry] },
      }
    case 'UPDATE_RESISTANCE':
      return {
        form: {
          ...state.form,
          resistances: state.form.resistances.map((r, i) => (i === action.index ? action.entry : r)),
        },
      }
    case 'REMOVE_RESISTANCE':
      return {
        form: {
          ...state.form,
          resistances: state.form.resistances.filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_AURA':
      return {
        form: { ...state.form, auras: [...(state.form.auras ?? []), action.entry] },
      }
    case 'UPDATE_AURA':
      return {
        form: {
          ...state.form,
          auras: (state.form.auras ?? []).map((a, i) => (i === action.index ? action.entry : a)),
        },
      }
    case 'REMOVE_AURA':
      return {
        form: {
          ...state.form,
          auras: (state.form.auras ?? []).filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_RITUAL':
      return {
        form: { ...state.form, rituals: [...(state.form.rituals ?? []), action.entry] },
      }
    case 'UPDATE_RITUAL':
      return {
        form: {
          ...state.form,
          rituals: (state.form.rituals ?? []).map((r, i) => (i === action.index ? action.entry : r)),
        },
      }
    case 'REMOVE_RITUAL':
      return {
        form: {
          ...state.form,
          rituals: (state.form.rituals ?? []).filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_SKILL':
      return {
        form: { ...state.form, skills: [...state.form.skills, action.entry] },
      }
    case 'UPDATE_SKILL':
      return {
        form: {
          ...state.form,
          skills: state.form.skills.map((s, i) => (i === action.index ? action.entry : s)),
        },
      }
    case 'REMOVE_SKILL':
      return {
        form: {
          ...state.form,
          skills: state.form.skills.filter((_, i) => i !== action.index),
        },
      }
    case 'ADD_SPELLCASTING_ENTRY':
      return {
        form: { ...state.form, spellcasting: [...(state.form.spellcasting ?? []), action.entry] },
      }
    case 'UPDATE_SPELLCASTING_ENTRY':
      return {
        form: {
          ...state.form,
          spellcasting: (state.form.spellcasting ?? []).map((e, i) =>
            i === action.index ? action.entry : e,
          ),
        },
      }
    case 'REMOVE_SPELLCASTING_ENTRY':
      return {
        form: {
          ...state.form,
          spellcasting: (state.form.spellcasting ?? []).filter((_, i) => i !== action.index),
        },
      }
  }
}

export function makeInitialState(form: CreatureStatBlockData): BuilderState {
  return { form }
}
