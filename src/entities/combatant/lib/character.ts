import type { Combatant } from '../model/types'
import type { CharacterRecord, EncounterCombatantRow } from '@/shared/api'
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

export function createCharacterGroupCombatants(
  characters: CharacterRecord[],
  existingCombatants: Combatant[],
): Combatant[] {
  const presentIds = new Set(existingCombatants.filter((c) => c.kind === 'pc').map((c) => c.creatureRef))
  const added: Combatant[] = []
  for (const character of characters) {
    if (presentIds.has(character.id)) continue
    added.push(createCombatantFromCharacter(character, [...existingCombatants, ...added]))
    presentIds.add(character.id)
  }
  return added
}

export function toEncounterCombatant(
  combatant: Combatant,
  encounterId: string,
  sortOrder: number,
): EncounterCombatantRow {
  return {
    id: combatant.id,
    encounterId,
    creatureRef: combatant.creatureRef,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    isNPC: combatant.kind !== 'pc',
    weakEliteTier: combatant.kind === 'npc' ? combatant.weakEliteTier ?? 'normal' : 'normal',
    creatureLevel: combatant.level ?? 0,
    sortOrder,
    isHazard: combatant.kind === 'hazard',
    hazardRef: combatant.kind === 'hazard' ? combatant.creatureRef : null,
    side: combatant.side ?? (combatant.kind === 'pc' ? 'ally' : 'enemy'),
    perception: combatant.kind === 'npc' ? combatant.perception : undefined,
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
