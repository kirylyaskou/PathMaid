import type { HazardRow } from '@/shared/api'

const WORD_COUNTS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
}

export function requiredDisableChecks(hazard: HazardRow): number | null {
  if (hazard.required_successes && hazard.required_successes > 1) return hazard.required_successes
  const text = (hazard.disable_details ?? '').replace(/<[^>]*>/g, ' ').toLowerCase()
  const match = text.match(/\b(\d+|two|three|four|five|six)\s+(?:successful\s+)?(?:\w+\s+){0,3}(?:checks?|successes)\s+(?:are\s+)?required\b/)
    ?? text.match(/\brequires?\s+(\d+|two|three|four|five|six)\s+(?:successful\s+)?(?:checks?|successes)\b/)
  if (!match) return null
  const count = WORD_COUNTS[match[1]] ?? Number(match[1])
  return Number.isInteger(count) && count > 1 ? count : null
}

export function advanceDisableCheck(progress: number, required: number): { hazardCheckProgress: number; hazardDisabled: boolean } {
  const hazardCheckProgress = Math.min(required, progress + 1)
  return { hazardCheckProgress, hazardDisabled: hazardCheckProgress >= required }
}
