import type { ReactElement } from 'react'
import type { Modifier, InactiveModifier } from '@engine'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'

interface ModifierTooltipProps {
  modifiers: Modifier[]
  netModifier: number
  finalDisplay: string
  children: ReactElement
  /**
   * Predicate-gated modifiers that target this stat but are currently
   * inactive (predicate evaluated to false). Rendered beneath the active
   * block with `line-through opacity-50` and a `requires: <atom>` subtitle
   * so the GM can see which buff/debuff would fire once the trigger is met.
   */
  inactiveModifiers?: InactiveModifier[]
  /**
   * Opt-in flag for the inactive block. Defaulting to `false` keeps every
   * existing call-site visually unchanged — only the new Phase 66 paths
   * that want the "gated by predicate" readout pass `showInactive`.
   */
  showInactive?: boolean
}

/**
 * Wraps a trigger element in a modifier-breakdown Tooltip when there are
 * active (or, with `showInactive`, inactive) modifiers. Renders the children
 * unwrapped when both lists are empty.
 */
export function ModifierTooltip({
  modifiers,
  netModifier,
  finalDisplay,
  inactiveModifiers,
  showInactive = false,
  children,
}: ModifierTooltipProps) {
  const hasInactive = showInactive && (inactiveModifiers?.length ?? 0) > 0
  if (modifiers.length === 0 && !hasInactive) return children

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
        {modifiers.length > 0 && (
          <div className="border-t border-border mt-1 pt-1 flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className={netModifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
              {finalDisplay}
            </span>
          </div>
        )}
        {hasInactive && (
          <div className="border-t border-border mt-1 pt-1 space-y-1">
            {inactiveModifiers!.map((m) => (
              <div key={m.slug} className="opacity-50">
                <div className="flex justify-between gap-4 line-through">
                  <span>{m.label}</span>
                  <span>
                    {m.modifier > 0 ? '+' : ''}
                    {m.modifier}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground italic pl-1">
                  requires: {m.requires}
                </div>
              </div>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
