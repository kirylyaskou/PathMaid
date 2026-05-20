import { ChevronDown, Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
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

      <Collapsible defaultOpen className="group rounded border border-border/35 bg-secondary/10">
        <CollapsibleTrigger className="flex h-7 w-full items-center justify-between px-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <span>Skills</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-1.5 pb-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Button
              variant="secondary"
              className="h-7 text-xs gap-1"
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
                className="h-7 text-xs gap-1"
                onClick={() => void handleHide()}
              >
                <EyeOff className="w-3 h-3" />
                Hide <span className="font-mono">{formatModifier(getModified(baseStealth, 'stealth'))}</span>
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
