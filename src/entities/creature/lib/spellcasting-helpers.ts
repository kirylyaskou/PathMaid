import { Zap, Flame, Leaf, Feather } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { resolveFoundryTokens } from '@/shared/lib/foundry-tokens'
export { rankLabel, actionCostLabel } from '@/shared/lib/pf2e-display'

export function traditionColor(tradition: string): string {
  const map: Record<string, string> = {
    arcane: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    divine: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    occult: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    primal: 'bg-green-500/20 text-green-300 border-green-500/30',
  }
  return map[tradition.toLowerCase()] ?? 'bg-secondary text-secondary-foreground border-border'
}

export const TRADITION_SLOT_CONFIG: Record<string, {
  icon: LucideIcon
  available: string
  spent: string
}> = {
  arcane: {
    icon: Zap,
    available: 'bg-blue-500/80 text-blue-100 border-blue-400/70',
    spent: 'border-blue-500/30',
  },
  occult: {
    icon: Flame,
    available: 'bg-purple-500/80 text-purple-100 border-purple-400/70',
    spent: 'border-purple-500/30',
  },
  primal: {
    icon: Leaf,
    available: 'bg-green-500/80 text-green-100 border-green-400/70',
    spent: 'border-green-500/30',
  },
  divine: {
    icon: Feather,
    available: 'bg-yellow-500/80 text-yellow-100 border-yellow-400/70',
    spent: 'border-yellow-500/30',
  },
}

export const RANK_WARNINGS: Record<number, string> = {
  1: 'GIT GUD',
  2: 'Mister wizard pants, huh?',
  3: 'Morrigan disapproves.',
  4: 'Fane raises an eyebrow. He has no eyebrows.',
  5: 'Optimism is a moral imperative. But I think you\'ve moved beyond optimism.',
  6: 'Daeran finds this mildly amusing.',
  7: 'Ignorant slaves, how quickly you forget!',
  8: 'The Greybeards shout "FUS RO NO".',
  9: 'Areelu Vorlesh takes notes. This is now a thesis on hubris.',
  10: 'Fear not the dark, my friend. And let the feast begin.',
}

/** Alias for resolveFoundryTokens — used in spell card descriptions */
export const resolveFoundryTokensForSpell = resolveFoundryTokens
