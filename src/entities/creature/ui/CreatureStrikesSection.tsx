import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible'
import { SectionHeader } from '@/shared/ui/section-header'
import { CreatureStrikeRow } from './CreatureStrikeRow'
import type { EffectiveStrike } from '../model/use-effective-strikes'
import type { StrikeLoc } from '@/shared/i18n'

interface CreatureStrikesSectionProps {
  strikes: EffectiveStrike[]
  creatureName: string
  encounterId: string | undefined
  currentMapIndex: number
  isMapTracked: boolean
  onAttackClick: (strike: EffectiveStrike, mapIdx: number) => void
  strikesLoc?: StrikeLoc[]
}

export function CreatureStrikesSection({
  strikes,
  creatureName,
  encounterId,
  currentMapIndex,
  isMapTracked,
  onAttackClick,
  strikesLoc,
}: CreatureStrikesSectionProps) {
  return (
    <Collapsible defaultOpen>
      <SectionHeader>Strikes</SectionHeader>
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
              strikeLoc={strikesLoc?.[i]}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
