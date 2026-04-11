import type { ReactElement } from 'react'
import type { Modifier } from '@engine'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'

interface ModifierTooltipProps {
  modifiers: Modifier[]
  netModifier: number
  finalDisplay: string
  children: ReactElement
}

/**
 * Wraps a trigger element in a modifier-breakdown Tooltip when there are
 * active modifiers. Renders the children unwrapped when modifiers is empty.
 */
export function ModifierTooltip({ modifiers, netModifier, finalDisplay, children }: ModifierTooltipProps) {
  if (modifiers.length === 0) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
        {modifiers.map((m) => (
          <div key={m.slug} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{m.label}</span>
            <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
              {m.modifier > 0 ? '+' : ''}{m.modifier}
            </span>
          </div>
        ))}
        <div className="border-t border-border mt-1 pt-1 flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className={netModifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
            {finalDisplay}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
