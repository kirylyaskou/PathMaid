import type { Tier } from '@engine'

// Single source of truth for tier colors — UI-SPEC Tier Color Contract .
// Dark-mode tokens; light-mode is inherited via Tailwind's dark:/light: auto behavior
// since we use color-500/xx opacity tokens that work in both modes visually.

export const TIER_COLORS: Record<Tier, { text: string; bg: string; border: string }> = {
  extreme:  { text: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-500/40' },
  high:     { text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' },
  moderate: { text: 'text-sky-300',     bg: 'bg-sky-500/15',     border: 'border-sky-500/40' },
  low:      { text: 'text-zinc-300',    bg: 'bg-zinc-500/15',    border: 'border-zinc-500/40' },
  terrible: { text: 'text-rose-400',    bg: 'bg-rose-500/15',    border: 'border-rose-500/40' },
}

export const TIER_LABEL: Record<Tier, string> = {
  extreme:  'Extreme',
  high:     'High',
  moderate: 'Moderate',
  low:      'Low',
  terrible: 'Terrible',
}

export const TIER_ORDER: readonly Tier[] = ['extreme', 'high', 'moderate', 'low', 'terrible']
