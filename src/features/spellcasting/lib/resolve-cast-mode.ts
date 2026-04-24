import type { SpellcastingSection } from '@/entities/spell'

export function resolveCastMode(section: SpellcastingSection, spellModNet: number): {
  isFocus: boolean
  traditionFilter: string | undefined
  spellModColor: string
} {
  const isFocus = section.castType === 'focus'
  const traditionFilter = (section.castType === 'innate' || isFocus) ? undefined : section.tradition
  const spellModColor = spellModNet < 0
    ? 'text-pf-blood decoration-pf-blood/50'
    : spellModNet > 0
      ? 'text-pf-threat-low decoration-pf-threat-low/50'
      : ''
  return { isFocus, traditionFilter, spellModColor }
}
