import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { useConditionStore, ConditionBadge, removeCondition, setConditionLocked } from '@/entities/condition'
import { ConditionCombobox } from '@/features/combat-tracker'
import { getConditionBySlug } from '@/shared/api'
import type { ConditionRow } from '@/shared/api'
import type { ConditionSlug } from '@engine'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { cn } from '@/shared/lib/utils'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { parseJsonArray } from '@/shared/lib/json'

const GROUP_BADGE: Record<string, string> = {
  death:     'bg-red-900/50 text-red-300 border-red-700/40',
  abilities: 'bg-purple-900/50 text-purple-300 border-purple-700/40',
  senses:    'bg-blue-900/50 text-blue-300 border-blue-700/40',
  detection: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/40',
  attitudes: 'bg-amber-900/50 text-amber-300 border-amber-700/40',
}


function ConditionDetailPanel({ row, onClose }: { row: ConditionRow | 'not-found'; onClose: () => void }) {
  if (row === 'not-found') {
    return (
      <div className="mt-2 rounded-md border border-border/50 bg-secondary/40 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted-foreground">No reference data</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
        </div>
      </div>
    )
  }

  const group = row.group_name ?? 'other'
  const groupColor = GROUP_BADGE[group] ?? 'bg-zinc-800/50 text-zinc-400 border-zinc-700/40'
  const overrides = parseJsonArray(row.overrides)
  const descText = row.description ? sanitizeFoundryText(row.description).slice(0, 350) : ''

  return (
    <div className="mt-2 rounded-md border border-primary/30 bg-card p-3 space-y-1.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm flex-1">{row.name}</span>
        {row.is_valued ? (
          <span className="px-1 py-0.5 text-[10px] rounded border bg-orange-900/40 text-orange-300 border-orange-700/40 font-semibold">valued</span>
        ) : null}
        <span className={cn("px-1 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", groupColor)}>{group}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1"><X className="w-3 h-3" /></button>
      </div>

      {/* Modifier summary */}
      {row.modifier_summary && (
        <p className="text-xs text-amber-300/90 font-medium">{row.modifier_summary}</p>
      )}

      {/* Overrides */}
      {overrides.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Overrides: <span className="text-foreground">{overrides.map((o) => o.replace(/-/g, ' ')).join(', ')}</span>
        </p>
      )}

      {/* Description excerpt */}
      {descText && (
        <p className="text-xs text-foreground/75 leading-relaxed">
          {descText}{descText.length >= 350 ? '…' : ''}
        </p>
      )}
    </div>
  )
}

interface ConditionSectionProps {
  combatantId: string
}

export function ConditionSection({ combatantId }: ConditionSectionProps) {
  const conditions = useConditionStore(
    useShallow((s) => s.activeConditions.filter((c) => c.combatantId === combatantId))
  )
  const [detailRow, setDetailRow] = useState<ConditionRow | 'not-found' | null>(null)
  const [openConditionSlug, setOpenConditionSlug] = useState<string | null>(null)

  const handleRemove = useCallback(
    (slug: string) => {
      const removed = removeCondition(combatantId, slug as ConditionSlug)
      if (removed.length > 0) {
        toast(`Removed ${slug} — also removed: ${removed.join(', ')}`)
      }
      if (openConditionSlug === slug || removed.includes(openConditionSlug as ConditionSlug)) {
        setDetailRow(null)
        setOpenConditionSlug(null)
      }
    },
    [combatantId, openConditionSlug]
  )

  const handleToggleLock = useCallback(
    (slug: string, currentlyLocked: boolean) => {
      setConditionLocked(combatantId, slug as ConditionSlug, !currentlyLocked)
    },
    [combatantId]
  )

  const handleInfo = useCallback(async (slug: string) => {
    setOpenConditionSlug(slug)
    // Strip persistent-* prefix to look up base condition
    const baseSlug = slug.startsWith('persistent-') ? slug.replace('persistent-', '') : slug
    try {
      const row = await getConditionBySlug(baseSlug)
      setDetailRow(row ?? 'not-found')
    } catch {
      setDetailRow('not-found')
    }
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Conditions
        </h4>
        <ConditionCombobox
          combatantId={combatantId}
          existingSlugs={conditions.map((c) => c.slug)}
        />
      </div>
      {conditions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {conditions.map((c) => (
            <ConditionBadge
              key={c.slug}
              condition={c}
              onRemove={() => handleRemove(c.slug)}
              onToggleLock={() => handleToggleLock(c.slug, !!c.isLocked)}
              onInfo={() => handleInfo(c.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-border/40 py-3 text-center text-xs text-muted-foreground">
          No active conditions
        </div>
      )}

      {/* Condition detail panel */}
      {detailRow !== null && (
        <ConditionDetailPanel row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </div>
  )
}
