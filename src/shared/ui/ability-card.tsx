import type { ReactNode } from 'react'
import { ActionIcon } from './action-icon'

type ActionCost = 0 | 1 | 2 | 3 | 'reaction' | 'free'

interface AbilityCardProps {
  name: string
  actionCost?: ActionCost
  traits?: string[]
  /** Right-side meta label (type, level, etc.) */
  meta?: string
  children?: ReactNode
}

export function AbilityCard({ name, actionCost, traits, meta, children }: AbilityCardProps) {
  return (
    <div className="p-3 rounded bg-pf-parchment border-l-2 border-primary/30">
      <div className="flex items-center gap-2">
        {actionCost !== undefined && actionCost !== 0 && (
          <ActionIcon cost={actionCost} className="text-lg text-primary" />
        )}
        <span className="font-semibold text-sm flex-1">{name}</span>
        {meta && <span className="text-[11px] text-muted-foreground shrink-0">{meta}</span>}
      </div>
      {children && <div className="mt-1">{children}</div>}
      {traits && traits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {traits.map((trait) => (
            <span
              key={trait}
              className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
