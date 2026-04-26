import { useTranslation } from 'react-i18next'
import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible'
import { SectionHeader } from '@/shared/ui/section-header'
import { CreatureStrikeRow } from './CreatureStrikeRow'
import type { EffectiveStrike } from '../model/use-effective-strikes'
import type { AbilityLoc } from '@/shared/i18n'

interface CreatureStrikesSectionProps {
  strikes: EffectiveStrike[]
  creatureName: string
  encounterId: string | undefined
  currentMapIndex: number
  isMapTracked: boolean
  onAttackClick: (strike: EffectiveStrike, mapIdx: number) => void
  itemsLocById?: Map<string, AbilityLoc>
}

export function CreatureStrikesSection({
  strikes,
  creatureName,
  encounterId,
  currentMapIndex,
  isMapTracked,
  onAttackClick,
  itemsLocById,
}: CreatureStrikesSectionProps) {
  const { t } = useTranslation()
  return (
    <Collapsible defaultOpen>
      <SectionHeader>{t('statblock.strikes')}</SectionHeader>
      <CollapsibleContent>
        <div className="px-4 py-3 space-y-3">
          {strikes.map((strike, i) => (
            <CreatureStrikeRow
              key={`${strike.name}-${i}`}
              strike={strike}
              creatureName={creatureName}
              encounterId={encounterId}
              currentMapIndex={currentMapIndex}
              isMapTracked={isMapTracked}
              onAttackClick={onAttackClick}
              nameLoc={strike.id ? itemsLocById?.get(strike.id)?.name : undefined}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
