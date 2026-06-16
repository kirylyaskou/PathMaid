import type { Combatant } from '@/entities/combatant'
import type { CharacterRecord } from '@/shared/api'
import { calculatePCMaxHP, type PathbuilderBuild, type PathbuilderExport } from '@engine'

function parseCharacterBuild(rawJson: string): PathbuilderBuild {
  const parsed = JSON.parse(rawJson) as PathbuilderBuild | PathbuilderExport
  if ('build' in parsed && parsed.build) return parsed.build
  return parsed as PathbuilderBuild
}

export function createCombatantFromCharacter(
  character: CharacterRecord,
  existingCombatants: Combatant[],
): Combatant {
  const build = parseCharacterBuild(character.rawJson)
  const baseName = build.name || character.name
  const displayName = autoName(baseName, existingCombatants)
  const maxHp = calculatePCMaxHP(build)

  return {
    id: crypto.randomUUID(),
    creatureRef: character.id,
    displayName,
    initiative: 0,
    hp: maxHp,
    maxHp,
    tempHp: 0,
    kind: 'pc',
    side: 'ally',
    ...(build.level != null ? { level: build.level } : {}),
  }
}

function autoName(baseName: string, existingCombatants: Combatant[]): string {
  const pattern = new RegExp(`^${escapeRegex(baseName)}(\\s+\\d+)?$`)
  const matches = existingCombatants.filter((c) => pattern.test(c.displayName))
  if (matches.length === 0) return baseName

  let max = 0
  for (const combatant of matches) {
    const match = combatant.displayName.match(/\s+(\d+)$/)
    max = Math.max(max, match ? Number.parseInt(match[1], 10) : 1)
  }
  return `${baseName} ${max + 1}`
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
