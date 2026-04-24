import { StatRow } from '@/shared/ui/stat-row'
import type { CreatureStatBlockData } from '../model/types'
import { normalizeImmunities, formatImmunityWithExceptions } from '../model/iwr-normalize'
import type { MonsterStructuredLoc } from '@/shared/i18n'

type DefensesLoc = Pick<
  MonsterStructuredLoc,
  | 'acLoc'
  | 'hpLoc'
  | 'savesLoc'
  | 'weaknessesLoc'
  | 'resistancesLoc'
  | 'immunitiesLoc'
  | 'perceptionLoc'
  | 'languagesLoc'
  | 'abilityScoresLoc'
>

interface CreatureDefensesBlockProps {
  immunities: CreatureStatBlockData['immunities']
  resistances: CreatureStatBlockData['resistances']
  weaknesses: CreatureStatBlockData['weaknesses']
  defensesLoc?: Partial<DefensesLoc>
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
  defensesLoc,
}: CreatureDefensesBlockProps) {
  if (immunities.length === 0 && resistances.length === 0 && weaknesses.length === 0) {
    return null
  }

  // Presence of the loc array signals "this creature has a RU translation";
  // the label strings themselves are canonical pf2.ru terminology baked into the UI.
  const immunitiesLabel = defensesLoc?.immunitiesLoc !== undefined ? 'Иммунитеты' : 'Immunities'
  const resistancesLabel = defensesLoc?.resistancesLoc !== undefined ? 'Сопротивления' : 'Resistances'
  const weaknessesLabel = defensesLoc?.weaknessesLoc !== undefined ? 'Уязвимости' : 'Weaknesses'

  return (
    <div className="p-4 space-y-2">
      {immunities.length > 0 && (
        <StatRow label={immunitiesLabel}>
          {defensesLoc?.immunitiesLoc !== undefined && defensesLoc.immunitiesLoc.length === normalizeImmunities(immunities).length
            ? defensesLoc.immunitiesLoc.join(', ')
            : normalizeImmunities(immunities).map(formatImmunityWithExceptions).join(', ')}
        </StatRow>
      )}
      {resistances.length > 0 && (
        <StatRow label={resistancesLabel}>
          {defensesLoc?.resistancesLoc !== undefined && defensesLoc.resistancesLoc.length === resistances.length
            ? resistances.map((entry, i) => `${defensesLoc.resistancesLoc![i]} ${entry.value}`).join(', ')
            : resistances.map(formatIwrEntry).join(', ')}
        </StatRow>
      )}
      {weaknesses.length > 0 && (
        <StatRow label={weaknessesLabel}>
          {defensesLoc?.weaknessesLoc !== undefined && defensesLoc.weaknessesLoc.length === weaknesses.length
            ? weaknesses.map((entry, i) => `${defensesLoc.weaknessesLoc![i]} ${entry.value}`).join(', ')
            : weaknesses.map(formatIwrEntry).join(', ')}
        </StatRow>
      )}
    </div>
  )
}
