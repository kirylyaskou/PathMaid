import type { AbilityMods, CreatureStatBlockData } from '../model/types'

type AbilityKey = keyof AbilityMods

const SKILL_ABILITY: Record<string, AbilityKey> = {
  acrobatics: 'dex',
  arcana: 'int',
  athletics: 'str',
  crafting: 'int',
  deception: 'cha',
  diplomacy: 'cha',
  intimidation: 'cha',
  medicine: 'wis',
  nature: 'wis',
  occultism: 'int',
  performance: 'cha',
  religion: 'wis',
  society: 'int',
  stealth: 'dex',
  survival: 'wis',
  thievery: 'dex',
}

function getSkillAbility(name: string): AbilityKey | null {
  const slug = name.trim().toLowerCase()
  return SKILL_ABILITY[slug] ?? null
}

export function applyAbilityModDelta(
  form: CreatureStatBlockData,
  key: AbilityKey,
  value: number,
): CreatureStatBlockData {
  const previous = form.abilityMods[key] ?? 0
  const delta = value - previous
  const abilityMods = { ...form.abilityMods, [key]: value }
  if (delta === 0) return { ...form, abilityMods }

  const patched: CreatureStatBlockData = {
    ...form,
    abilityMods,
    skills: form.skills.map((skill) =>
      getSkillAbility(skill.name) === key
        ? { ...skill, modifier: skill.modifier + delta }
        : skill,
    ),
  }

  if (key === 'dex') {
    patched.ac = form.ac + delta
    patched.ref = form.ref + delta
    patched.stealth = form.stealth == null ? form.stealth : form.stealth + delta
  }

  if (key === 'con') {
    patched.fort = form.fort + delta
  }

  if (key === 'wis') {
    patched.will = form.will + delta
    patched.perception = form.perception + delta
  }

  return patched
}
