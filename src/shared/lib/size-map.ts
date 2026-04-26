export type DisplaySize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan'

export const SIZE_MAP: Record<string, DisplaySize> = {
  tiny: 'Tiny',
  sm: 'Small',
  med: 'Medium',
  lg: 'Large',
  huge: 'Huge',
  grg: 'Gargantuan',
}

export function mapSize(code: string | null | undefined): DisplaySize {
  if (!code) return 'Medium'
  return SIZE_MAP[code] ?? 'Medium'
}

/**
 * Inverse mapping DisplaySize → engine slug.
 *
 * UI works in DisplaySize space ('Medium'); dictionary getters
 * (getSizeLabel) expect the engine slug ('med'). This mapping is the
 * inverse of SIZE_MAP, used at the UI → dict-lookup boundary.
 */
export const INVERSE_SIZE_MAP: Record<DisplaySize, string> = {
  Tiny: 'tiny',
  Small: 'sm',
  Medium: 'med',
  Large: 'lg',
  Huge: 'huge',
  Gargantuan: 'grg',
}

export function unmapSize(size: DisplaySize): string {
  return INVERSE_SIZE_MAP[size]
}
