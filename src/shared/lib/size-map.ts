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
