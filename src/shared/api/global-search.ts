import { searchCreatures } from './creatures'
import { searchSpells } from './spells'
import { searchItems } from './items'
import { searchConditions } from './conditions'
import { searchHazards } from './hazards'
import { searchActions } from './actions'

export type EntityKind = 'creature' | 'spell' | 'item' | 'condition' | 'hazard' | 'action'

export interface GlobalSearchResult {
  id: string
  name: string
  kind: EntityKind
  subtitle?: string
}

export async function searchAllEntities(query: string): Promise<GlobalSearchResult[]> {
  if (!query.trim()) return []

  const [creatures, spells, items, conditions, hazards, actions] = await Promise.all([
    searchCreatures(query, 5),
    searchSpells(query),
    searchItems(query),
    searchConditions(query),
    searchHazards(query, 5),
    searchActions(query, 5),
  ])

  const results: GlobalSearchResult[] = [
    ...creatures.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      kind: 'creature' as EntityKind,
      subtitle: `Lvl ${c.level ?? '?'}`,
    })),
    ...spells.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.name_loc ?? s.name,
      kind: 'spell' as EntityKind,
      subtitle: `Rank ${s.rank}`,
    })),
    ...items.slice(0, 5).map((i) => ({
      id: i.id,
      name: i.name_loc ?? i.name,
      kind: 'item' as EntityKind,
      subtitle: `Lvl ${i.level}`,
    })),
    ...conditions.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      kind: 'condition' as EntityKind,
    })),
    ...hazards.slice(0, 5).map((h) => ({
      id: h.id,
      name: h.name_loc ?? h.name,
      kind: 'hazard' as EntityKind,
      subtitle: `Lvl ${h.level}`,
    })),
    ...actions.slice(0, 5).map((a) => ({
      id: a.id,
      name: a.name,
      kind: 'action' as EntityKind,
    })),
  ]

  return results
}
