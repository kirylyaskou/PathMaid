import { useState, useEffect, useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'
import { SearchInput } from '@/shared/ui/search-input'
import { getAllConditions } from '@/shared/api'
import type { ConditionRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { SafeHtml } from '@/shared/lib/safe-html'
import { useContentTranslation } from '@/shared/i18n'
import { parseJsonArray } from '@/shared/lib/json'
import { logError } from '@/shared/lib/error'

type GroupFilter = 'all' | 'death' | 'abilities' | 'senses' | 'detection' | 'attitudes' | 'other'

const GROUP_TABS: { value: GroupFilter; label: string; color: string }[] = [
  { value: 'all',       label: 'All',       color: 'text-foreground' },
  { value: 'death',     label: 'Death',     color: 'text-red-400' },
  { value: 'abilities', label: 'Abilities', color: 'text-purple-400' },
  { value: 'senses',    label: 'Senses',    color: 'text-blue-400' },
  { value: 'detection', label: 'Detection', color: 'text-cyan-400' },
  { value: 'attitudes', label: 'Attitudes', color: 'text-amber-400' },
  { value: 'other',     label: 'Other',     color: 'text-zinc-400' },
]

const GROUP_BADGE: Record<string, string> = {
  death:     'bg-red-900/50 text-red-300 border-red-700/40',
  abilities: 'bg-purple-900/50 text-purple-300 border-purple-700/40',
  senses:    'bg-blue-900/50 text-blue-300 border-blue-700/40',
  detection: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/40',
  attitudes: 'bg-amber-900/50 text-amber-300 border-amber-700/40',
}


function ConditionCard({ condition, expanded, onToggle }: {
  condition: ConditionRow
  expanded: boolean
  onToggle: () => void
}) {
  const group = condition.group_name ?? 'other'
  const groupColor = GROUP_BADGE[group] ?? 'bg-zinc-800/50 text-zinc-400 border-zinc-700/40'
  const overrides = parseJsonArray(condition.overrides)
  const { data: translation } = useContentTranslation('condition', condition.name, null)

  return (
    <div
      className={cn(
        'rounded-md border transition-colors cursor-pointer',
        expanded
          ? 'border-primary/40 bg-card'
          : 'border-border/40 bg-secondary/30 hover:border-border/70 hover:bg-secondary/50'
      )}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-semibold text-sm flex-1">{translation?.nameLoc ?? condition.name}</span>

        {/* Valued badge */}
        {condition.is_valued ? (
          <span className="px-1.5 py-0.5 text-[10px] rounded border font-semibold bg-orange-900/40 text-orange-300 border-orange-700/40 shrink-0">
            valued
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] rounded border font-semibold bg-green-900/30 text-green-400 border-green-700/30 shrink-0">
            ✓
          </span>
        )}

        {/* Group badge */}
        <span className={cn('px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold shrink-0', groupColor)}>
          {group}
        </span>
      </div>

      {/* Modifier summary — always visible if present */}
      {condition.modifier_summary && (
        <div className="px-3 pb-1.5">
          <p className="text-xs text-amber-300/80 font-medium">{condition.modifier_summary}</p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {/* Overrides */}
          {overrides.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Overrides:{' '}
              {overrides.map((o, i) => (
                <span key={o}>
                  <span className="text-foreground capitalize">{o.replace(/-/g, ' ')}</span>
                  {i < overrides.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          )}

          {/* Description — RU overlay via SafeHtml when present */}
          {translation?.textLoc ? (
            <SafeHtml
              html={translation.textLoc}
              className="text-xs text-foreground/80 leading-relaxed"
            />
          ) : (
            condition.description && (
              <p className="text-xs text-foreground/80 leading-relaxed">
                {sanitizeFoundryText(condition.description)}
              </p>
            )
          )}

          {/* Source */}
          {condition.source_book && (
            <p className="text-[10px] text-muted-foreground/60 italic">{condition.source_book}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ConditionsPage() {
  const [allConditions, setAllConditions] = useState<ConditionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<GroupFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAllConditions()
      .then(setAllConditions)
      .catch(logError('load-conditions'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = allConditions
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }
    if (activeGroup !== 'all') {
      if (activeGroup === 'other') {
        list = list.filter((c) => !c.group_name || !['death','abilities','senses','detection','attitudes'].includes(c.group_name))
      } else {
        list = list.filter((c) => c.group_name === activeGroup)
      }
    }
    return list
  }, [allConditions, query, activeGroup])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
        {/* Search */}
        <SearchInput
          placeholder="Search conditions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />

        {/* Group filter tabs */}
        <div className="flex flex-wrap gap-1">
          {GROUP_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveGroup(tab.value)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded border font-semibold transition-colors',
                activeGroup === tab.value
                  ? cn(tab.color, 'bg-secondary border-current')
                  : 'text-muted-foreground border-border/40 hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count row */}
      <div className="px-3 py-1.5 shrink-0 border-b border-border/30">
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${filtered.length} condition${filtered.length !== 1 ? 's' : ''}`}
          {(query || activeGroup !== 'all') && !loading && (
            <button
              onClick={() => { setQuery(''); setActiveGroup('all') }}
              className="ml-2 text-primary hover:underline"
            >
              clear
            </button>
          )}
        </p>
      </div>

      {/* Condition grid */}
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 xl:grid-cols-3 gap-1.5 auto-rows-min">
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <ShieldAlert className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {allConditions.length === 0
                ? 'Run sync to import conditions'
                : 'No conditions match the filters'}
            </p>
          </div>
        )}
        {filtered.map((condition) => (
          <ConditionCard
            key={condition.id}
            condition={condition}
            expanded={expandedId === condition.id}
            onToggle={() => setExpandedId((prev) => (prev === condition.id ? null : condition.id))}
          />
        ))}
      </div>
    </div>
  )
}
