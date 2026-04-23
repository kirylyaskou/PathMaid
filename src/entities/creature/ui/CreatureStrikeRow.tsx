import { cn } from '@/shared/lib/utils'
import { formatModifier } from '@/shared/lib/format'
import { damageTypeColor } from '@/shared/lib/damage-colors'
import { ActionIcon } from '@/shared/ui/action-icon'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import type { EffectiveStrike } from '../model/use-effective-strikes'

interface CreatureStrikeRowProps {
  strike: EffectiveStrike
  creatureName: string
  encounterId: string | undefined
  currentMapIndex: number
  isMapTracked: boolean
  onAttackClick: (strike: EffectiveStrike, mapIdx: number) => void
}

export function CreatureStrikeRow({
  strike,
  creatureName,
  encounterId,
  currentMapIndex,
  isMapTracked,
  onAttackClick,
}: CreatureStrikeRowProps) {
  const {
    name, modifier, traits, group, additionalDamage,
    isAgile, modifiedMod, map1, map2, strikeNet, strikeModResult,
    enfeebledPenalty, effectiveDamage,
    hasRange, range,
    displayReach, hasNonDefaultReach,
  } = strike
  void modifier

  return (
    <div className="p-3 rounded-md bg-secondary/50">
      <div className="flex items-center gap-2 flex-wrap">
        <ActionIcon cost={1} className="text-lg" />
        <span className="font-semibold">{name}</span>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {[0, 1, 2].map((mapIdx) => {
            const mod = mapIdx === 0 ? modifiedMod : mapIdx === 1 ? map1 : map2
            const title =
              mapIdx === 0
                ? `1st attack — Roll 1d20${formatModifier(mod)}`
                : mapIdx === 1
                  ? `2nd attack (${isAgile ? '-4' : '-5'} agile/normal) — Roll 1d20${formatModifier(mod)}`
                  : `3rd attack (${isAgile ? '-8' : '-10'} agile/normal) — Roll 1d20${formatModifier(mod)}`
            const active = isMapTracked && currentMapIndex === mapIdx
            const btn = (
              <button
                key={mapIdx}
                type="button"
                title={title}
                onClick={() => onAttackClick(strike, mapIdx)}
                className={cn(
                  'px-1.5 py-0.5 rounded font-mono transition-colors border',
                  active
                    ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                    : 'bg-muted/30 border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {formatModifier(mod)}
              </button>
            )
            if (mapIdx === 0 && strikeModResult) {
              return (
                <ModifierTooltip
                  key={mapIdx}
                  modifiers={strikeModResult.modifiers}
                  netModifier={strikeNet}
                  finalDisplay={formatModifier(mod)}
                  inactiveModifiers={strikeModResult.inactiveModifiers}
                  showInactive
                >
                  {btn}
                </ModifierTooltip>
              )
            }
            return btn
          })}
        </div>
        {hasRange && (
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/60">
            Range {range} ft
          </span>
        )}
        {hasNonDefaultReach && (
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/60">
            Reach {displayReach} ft
          </span>
        )}
      </div>

      {effectiveDamage.length > 0 && (
        <div className="mt-1 text-sm">
          <span className="font-semibold">Damage </span>
          {effectiveDamage.map((d, di) => (
            <span key={di}>
              {di > 0 && <span className="text-muted-foreground"> plus </span>}
              <ClickableFormula
                formula={d.formula}
                label={`${name} damage`}
                source={creatureName}
                combatId={encounterId}
              />
              {d.type && (
                <span className={cn('font-mono', damageTypeColor(d.type))}> {d.type}</span>
              )}
              {d.persistent && (
                <span className="ml-1 px-1 py-0.5 text-[10px] rounded border bg-orange-900/40 text-orange-300 border-orange-700/40 font-semibold">persistent</span>
              )}
            </span>
          ))}
          {enfeebledPenalty < 0 && (
            <span className="ml-1 font-mono text-xs text-pf-blood">
              {enfeebledPenalty} <span className="text-muted-foreground">(Enfeebled)</span>
            </span>
          )}
        </div>
      )}

      {additionalDamage && additionalDamage.length > 0 && (
        <div className="mt-1 text-sm space-y-0.5">
          {additionalDamage.map((ad, adi) => (
            <div key={adi}>
              {ad.label && (
                <span className="text-muted-foreground text-xs">{ad.label}: </span>
              )}
              <ClickableFormula
                formula={ad.formula}
                label={ad.label ?? `${name} damage`}
                source={creatureName}
                combatId={encounterId}
              />
              {ad.type && (
                <span className={cn('font-mono', damageTypeColor(ad.type))}> {ad.type}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {group && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/60">
            Group: {group}
          </span>
        </div>
      )}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {traits.map((trait) => (
            <span
              key={trait}
              className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
