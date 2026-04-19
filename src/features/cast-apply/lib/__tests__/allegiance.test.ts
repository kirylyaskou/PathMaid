import { describe, it, expect } from 'vitest'
import { factionOf, splitByAllegiance } from '../allegiance'
import type { Combatant } from '@/entities/combatant'

function npc(id: string, name = id): Combatant {
  return {
    id,
    displayName: name,
    initiative: 0,
    hp: 10,
    maxHp: 10,
    tempHp: 0,
    kind: 'npc',
    creatureRef: 'x',
  }
}
function pc(id: string, name = id): Combatant {
  return {
    id,
    displayName: name,
    initiative: 0,
    hp: 10,
    maxHp: 10,
    tempHp: 0,
    kind: 'pc',
    creatureRef: 'x',
  }
}
function hazard(id: string, name = id): Combatant {
  return {
    id,
    displayName: name,
    initiative: 0,
    hp: 10,
    maxHp: 10,
    tempHp: 0,
    kind: 'hazard',
    creatureRef: 'x',
  }
}

describe('factionOf', () => {
  it('classifies PC as pc, NPC + hazard as npc', () => {
    expect(factionOf(pc('p'))).toBe('pc')
    expect(factionOf(npc('n'))).toBe('npc')
    expect(factionOf(hazard('h'))).toBe('npc')
  })
})

describe('splitByAllegiance', () => {
  it('NPC caster: NPCs are allies, PCs are enemies', () => {
    const roster = [npc('n1'), npc('n2'), pc('p1'), pc('p2')]
    const buckets = splitByAllegiance(roster, 'n1')
    expect(buckets.caster?.id).toBe('n1')
    expect(buckets.allies.map((a) => a.id)).toEqual(['n2'])
    expect(buckets.enemies.map((e) => e.id)).toEqual(['p1', 'p2'])
  })

  it('PC caster: PCs are allies, NPCs + hazards are enemies', () => {
    const roster = [pc('p1'), pc('p2'), npc('n1'), hazard('h1')]
    const buckets = splitByAllegiance(roster, 'p1')
    expect(buckets.caster?.id).toBe('p1')
    expect(buckets.allies.map((a) => a.id)).toEqual(['p2'])
    expect(buckets.enemies.map((e) => e.id)).toEqual(['n1', 'h1'])
  })

  it('solo caster has empty allies bucket', () => {
    const roster = [npc('solo'), pc('p1')]
    const buckets = splitByAllegiance(roster, 'solo')
    expect(buckets.allies).toEqual([])
    expect(buckets.enemies.map((e) => e.id)).toEqual(['p1'])
  })

  it('caster not in roster: allies/enemies still split using default npc faction', () => {
    const roster = [npc('n1'), pc('p1')]
    const buckets = splitByAllegiance(roster, 'missing')
    expect(buckets.caster).toBeNull()
    expect(buckets.allies.map((a) => a.id)).toEqual(['n1'])
    expect(buckets.enemies.map((e) => e.id)).toEqual(['p1'])
  })
})
