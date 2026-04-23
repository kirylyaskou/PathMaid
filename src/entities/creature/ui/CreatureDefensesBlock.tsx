import { StatRow } from '@/shared/ui/stat-row'
import type { CreatureStatBlockData } from '../model/types'
import { normalizeImmunities, formatImmunityWithExceptions } from '../model/iwr-normalize'

interface CreatureDefensesBlockProps {
  immunities: CreatureStatBlockData['immunities']
  resistances: CreatureStatBlockData['resistances']
  weaknesses: CreatureStatBlockData['weaknesses']
}

function formatIwrEntry(entry: { type: string; value: number; exceptions?: string[] }) {
  const base = `${entry.type} ${entry.value}`
  return entry.exceptions && entry.exceptions.length > 0
    ? `${base} (except ${entry.exceptions.join(', ')})`
    : base
}

export function CreatureDefensesBlock({
  immunities,
  resistances,
  weaknesses,
}: CreatureDefensesBlockProps) {
  if (immunities.length === 0 && resistances.length === 0 && weaknesses.length === 0) {
    return null
  }
  return (
    <div className="p-4 space-y-2">
      {immunities.length > 0 && (
        <StatRow label="Immunities">
          {normalizeImmunities(immunities).map(formatImmunityWithExceptions).join(', ')}
        </StatRow>
      )}
      {resistances.length > 0 && (
        <StatRow label="Resistances">
          {resistances.map(formatIwrEntry).join(', ')}
        </StatRow>
      )}
      {weaknesses.length > 0 && (
        <StatRow label="Weaknesses">
          {weaknesses.map(formatIwrEntry).join(', ')}
        </StatRow>
      )}
    </div>
  )
}
