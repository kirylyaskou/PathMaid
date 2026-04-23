import { useMemo } from 'react'
import { getHpAdjustment, getStatAdjustment } from '@engine'
import { CreatureCard } from './CreatureCard'
import { toCreature } from '../model/mappers'
import type { CreatureRow } from '@/shared/api'
import type { WeakEliteTier } from '../model/types'

interface BestiaryResultRowProps {
  row: CreatureRow
  tier: WeakEliteTier
  onAdd: () => void
  onAddToStaging?: () => void
  onClick?: () => void
  isCustom?: boolean
}

/**
 * Renders one bestiary/custom-creature search result: compact CreatureCard +
 * a tier-delta footer when the chosen tier shifts HP/AC off the base value.
 * Shared between BestiarySearchPanel and CreatureSearchSidebar to keep the
 * tier preview and custom-row styling in one place.
 */
export function BestiaryResultRow({
  row, tier, onAdd, onAddToStaging, onClick, isCustom,
}: BestiaryResultRowProps) {
  const creature = useMemo(() => toCreature(row), [row])
  const hpDelta = getHpAdjustment(tier, creature.level)
  const statDelta = getStatAdjustment(tier)
  const adjustedHp = Math.max(1, creature.hp + hpDelta)

  const card = (
    <CreatureCard
      creature={creature}
      compact
      onAdd={onAdd}
      onAddToStaging={onAddToStaging}
      onClick={onClick}
      className={isCustom ? 'border-l-2 border-l-pf-gold' : undefined}
    />
  )

  return (
    <>
      {isCustom ? (
        <div className="relative">
          <span className="absolute top-1.5 right-1.5 z-10 text-[10px] px-1.5 py-0.5 rounded bg-pf-gold/15 text-pf-gold border border-pf-gold/30 pointer-events-none uppercase tracking-wider">
            custom
          </span>
          {card}
        </div>
      ) : (
        card
      )}
      {hpDelta !== 0 && (
        <p className="text-[10px] text-muted-foreground px-2 -mt-0.5 mb-1">
          HP: {creature.hp} → {adjustedHp}{' '}
          <span className={hpDelta > 0 ? 'text-primary' : 'text-destructive'}>
            ({hpDelta > 0 ? '+' : ''}{hpDelta})
          </span>
          {' | '}AC: {creature.ac} → {creature.ac + statDelta}{' '}
          <span className={statDelta > 0 ? 'text-primary' : 'text-destructive'}>
            ({statDelta > 0 ? '+' : ''}{statDelta})
          </span>
        </p>
      )}
    </>
  )
}
