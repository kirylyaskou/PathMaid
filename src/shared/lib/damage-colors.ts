export const DAMAGE_TYPE_THEME: Record<string, { text: string; chip: string }> = {
  // Physical
  bludgeoning: { text: 'text-zinc-400',    chip: 'bg-slate-600 text-slate-100' },
  slashing:    { text: 'text-zinc-400',    chip: 'bg-slate-600 text-slate-100' },
  piercing:    { text: 'text-zinc-400',    chip: 'bg-slate-600 text-slate-100' },
  bleed:       { text: 'text-red-400',     chip: 'bg-slate-600 text-slate-100' },
  // Energy
  fire:        { text: 'text-orange-400',  chip: 'bg-amber-800/80 text-amber-200' },
  cold:        { text: 'text-cyan-300',    chip: 'bg-amber-800/80 text-amber-200' },
  electricity: { text: 'text-yellow-300',  chip: 'bg-amber-800/80 text-amber-200' },
  acid:        { text: 'text-lime-400',    chip: 'bg-amber-800/80 text-amber-200' },
  sonic:       { text: 'text-violet-400',  chip: 'bg-amber-800/80 text-amber-200' },
  force:       { text: 'text-blue-400',    chip: 'bg-amber-800/80 text-amber-200' },
  vitality:    { text: 'text-green-400',   chip: 'bg-amber-800/80 text-amber-200' },
  void:        { text: 'text-pink-400',    chip: 'bg-amber-800/80 text-amber-200' },
  // Positive/Negative (PF2e remaster aliases)
  positive:    { text: 'text-green-400',   chip: 'bg-amber-800/80 text-amber-200' },
  healing:     { text: 'text-green-400',   chip: 'bg-amber-800/80 text-amber-200' },
  negative:    { text: 'text-pink-400',    chip: 'bg-amber-800/80 text-amber-200' },
  // Alignment
  holy:        { text: 'text-yellow-200',  chip: 'bg-violet-800/80 text-violet-200' },
  unholy:      { text: 'text-purple-600',  chip: 'bg-violet-800/80 text-violet-200' },
  chaotic:     { text: 'text-orange-500',  chip: 'bg-violet-800/80 text-violet-200' },
  lawful:      { text: 'text-slate-400',   chip: 'bg-violet-800/80 text-violet-200' },
  good:        { text: 'text-amber-300',   chip: 'bg-violet-800/80 text-violet-200' },
  evil:        { text: 'text-purple-800',  chip: 'bg-violet-800/80 text-violet-200' },
  // Other
  poison:      { text: 'text-emerald-400', chip: 'bg-zinc-600 text-zinc-200' },
  mental:      { text: 'text-indigo-400',  chip: 'bg-zinc-600 text-zinc-200' },
  spirit:      { text: 'text-violet-300',  chip: 'bg-zinc-600 text-zinc-200' },
  untyped:     { text: 'text-zinc-500',    chip: 'bg-zinc-600 text-zinc-200' },
  // Material traits
  'cold-iron':  { text: 'text-zinc-400',   chip: 'bg-emerald-800/80 text-emerald-200' },
  silver:       { text: 'text-zinc-400',   chip: 'bg-emerald-800/80 text-emerald-200' },
  adamantine:   { text: 'text-zinc-400',   chip: 'bg-emerald-800/80 text-emerald-200' },
  mithral:      { text: 'text-zinc-400',   chip: 'bg-emerald-800/80 text-emerald-200' },
  magic:        { text: 'text-zinc-400',   chip: 'bg-emerald-800/80 text-emerald-200' },
}

/** CSS class for inline damage type text (e.g. "fire" in attack descriptions) */
export function damageTypeColor(type: string): string {
  return DAMAGE_TYPE_THEME[type.toLowerCase()]?.text ?? 'text-pf-blood'
}

/** CSS classes for damage type chip/badge (background + text) */
export function damageTypeChip(type: string): string {
  return DAMAGE_TYPE_THEME[type.toLowerCase()]?.chip ?? 'bg-muted text-muted-foreground'
}
