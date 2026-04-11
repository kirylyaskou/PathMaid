import { Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { useRoll } from '@/shared/hooks'
import { useHideAction } from '../model/use-hide-action'
import type { CreatureStatBlockData } from '@/entities/creature'

interface CombatantSavesBarProps {
  combatantId: string
  combatantName: string
  creature: CreatureStatBlockData
  ac: number
  getModified: (base: number, statSlug: string) => number
}

export function CombatantSavesBar({
  combatantId,
  combatantName,
  creature,
  ac,
  getModified,
}: CombatantSavesBarProps) {
  const doRoll = useRoll(combatantName)
  const { handleHide, baseStealth } = useHideAction(combatantId, combatantName, creature, getModified)

  function rollStat(mod: number, label: string) {
    doRoll(formatRollFormula(mod), label)
  }

  return (
    <>
      {/* AC */}
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">AC</span>
        <span className="text-lg font-mono font-bold">{ac}</span>
      </div>

      {/* Fort / Ref / Will */}
      <div className="flex gap-1">
        {[
          { label: 'Fort', slug: 'fortitude', base: creature.fort },
          { label: 'Ref', slug: 'reflex', base: creature.ref },
          { label: 'Will', slug: 'will', base: creature.will },
        ].map(({ label, slug, base }) => {
          const mod = getModified(base, slug)
          return (
            <Button
              key={slug}
              variant="secondary"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() =>
                rollStat(mod, label === 'Fort' ? 'Fortitude' : label === 'Ref' ? 'Reflex' : 'Will')
              }
            >
              {label} <span className="font-mono">{formatModifier(mod)}</span>
            </Button>
          )
        })}
      </div>

      {/* Seek + Hide */}
      <div className="flex gap-1">
        <Button
          variant="secondary"
          className="flex-1 h-7 text-xs gap-1"
          onClick={() => rollStat(getModified(creature.perception, 'perception'), 'Seek (Perception)')}
        >
          <Eye className="w-3 h-3" />
          Seek{' '}
          <span className="font-mono">
            {formatModifier(getModified(creature.perception, 'perception'))}
          </span>
        </Button>
        {baseStealth !== null && (
          <Button
            variant="secondary"
            className="flex-1 h-7 text-xs gap-1"
            onClick={() => void handleHide()}
          >
            <EyeOff className="w-3 h-3" />
            Hide <span className="font-mono">{formatModifier(getModified(baseStealth, 'stealth'))}</span>
          </Button>
        )}
      </div>
    </>
  )
}
