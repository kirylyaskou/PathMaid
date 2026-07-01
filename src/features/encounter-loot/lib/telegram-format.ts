import { groupEncounterLootItems } from './resolve-loot'
import type { ResolvedEncounterLoot } from './types'

const GROUP_HEADINGS: Record<string, string> = {
  weapon: '⚔️ Weapons',
  armor: '🛡️ Armor & Shields',
  consumable: '🧪 Consumables',
  treasure: '💰 Treasure',
  other: '📦 Other',
}

function formatQuantity(quantity: number): string {
  return quantity > 1 ? `${quantity}x ` : ''
}

function formatDetail(priceGp: number | null, bulk: string | null): string {
  const details = [
    priceGp === null ? null : `${priceGp} gp`,
    bulk ? `Bulk ${bulk}` : null,
  ].filter((value): value is string => value !== null)
  return details.length > 0 ? ` (${details.join(', ')})` : ''
}

export function formatEncounterLootTelegram(loot: ResolvedEncounterLoot): string {
  const lines = ['🎁 Loot']
  const groups = groupEncounterLootItems(loot.items)

  for (const group of groups) {
    lines.push('', GROUP_HEADINGS[group.key] ?? GROUP_HEADINGS.other)
    for (const item of group.items) {
      const source = item.combatantName ? ` — ${item.combatantName}` : ''
      const notes = item.notes ? ` — ${item.notes}` : ''
      lines.push(`• ${formatQuantity(item.remainingQuantity)}${item.name}${formatDetail(item.priceGp, item.bulk)}${source}${notes}`)
    }
  }

  return lines.join('\n')
}
