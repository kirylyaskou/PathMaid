export type { ItemRow, CreatureItemRow } from '@/shared/api'

export const ITEM_TYPE_LABELS: Record<string, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  consumable: 'Consumable',
  equipment: 'Equipment',
  treasure: 'Treasure',
  backpack: 'Container',
  shield: 'Shield',
  kit: 'Kit',
  book: 'Book',
  effect: 'Effect',
}

export const ITEM_TYPE_COLORS: Record<string, string> = {
  weapon:     'bg-red-500/20 text-red-300 border-red-500/40',
  armor:      'bg-blue-500/20 text-blue-300 border-blue-500/40',
  consumable: 'bg-green-500/20 text-green-300 border-green-500/40',
  equipment:  'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
  treasure:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  backpack:   'bg-amber-500/20 text-amber-300 border-amber-500/40',
  shield:     'bg-orange-500/20 text-orange-300 border-orange-500/40',
  kit:        'bg-purple-500/20 text-purple-300 border-purple-500/40',
  book:       'bg-slate-500/20 text-slate-300 border-slate-500/40',
  effect:     'bg-teal-500/20 text-teal-300 border-teal-500/40',
}

export const RARITY_COLORS: Record<string, string> = {
  common:   'text-muted-foreground',
  uncommon: 'text-orange-400',
  rare:     'text-blue-400',
  unique:   'text-purple-400',
}
