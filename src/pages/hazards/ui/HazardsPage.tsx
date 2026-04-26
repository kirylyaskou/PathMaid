import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { SearchInput } from '@/shared/ui/search-input'
import { LevelBadge } from '@/shared/ui/level-badge'
import { getAllHazards } from '@/shared/api'
import type { HazardRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { parseJsonArray } from '@/shared/lib/json'
import { logError } from '@/shared/lib/error'
import { stripRarityMarker } from '@/shared/lib/display-name'
import { useCurrentLocale } from '@/shared/i18n'
import { NoTranslationBadge } from '@/shared/ui/no-translation-badge'
import { SafeHtml } from '@/shared/lib/safe-html'
import type { MonsterStructuredLoc } from '@/shared/i18n/pf2e-content/lib'

function parseStructured(json: string | null): MonsterStructuredLoc | null {
  if (!json) return null
  try {
    return JSON.parse(json) as MonsterStructuredLoc
  } catch {
    return null
  }
}

type TypeFilter = 'all' | 'simple' | 'complex'

const sanitize = sanitizeFoundryText

interface HazardAction {
  name: string
  actionType: string
  description: string | null
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  action: '⚡',
  reaction: '↩',
  passive: '●',
  free: '◇',
}

function HazardCard({ hazard, expanded, onToggle }: {
  hazard: HazardRow
  expanded: boolean
  onToggle: () => void
}) {
  const traits = parseJsonArray(hazard.traits)
  const actions = parseJsonArray<HazardAction>(hazard.actions_json)
  const locale = useCurrentLocale()
  const structured = useMemo(() => parseStructured(hazard.structured_json), [hazard.structured_json])
  // Build a name→RU description map from structured.items so action rows can
  // surface translated trigger/effect text by name match against actions_json.
  const itemDescByName = useMemo(() => {
    const map = new Map<string, string>()
    if (!structured?.items) return map
    for (const item of structured.items) {
      if (typeof item.description === 'string' && item.description.length > 0) {
        map.set(item.name.toLowerCase(), item.description)
      }
    }
    return map
  }, [structured])
  // Prefer structured RU fields when locale=ru AND vendor data present.
  const isRu = locale === 'ru'
  const descriptionText = isRu ? (structured?.descriptionHazard ?? structured?.description ?? hazard.description) : hazard.description
  const disableText = isRu ? (structured?.disableDetails ?? hazard.disable_details) : hazard.disable_details
  const resetText = isRu ? (structured?.resetDetails ?? hazard.reset_details) : hazard.reset_details
  const stealthText = isRu ? (structured?.stealthDetails ?? hazard.stealth_details) : hazard.stealth_details
  const showUntranslated = locale === 'ru' && !hazard.name_loc

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
        <LevelBadge level={hazard.level} size="sm" />

        <span className="font-semibold text-sm flex-1">{stripRarityMarker(hazard.name_loc ?? hazard.name)}</span>
        {showUntranslated && <NoTranslationBadge />}

        {hazard.is_complex ? (
          <span className="px-1.5 py-0.5 text-[10px] rounded border font-semibold bg-orange-900/40 text-orange-300 border-orange-700/40 shrink-0">
            complex
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] rounded border font-semibold bg-zinc-800/50 text-zinc-400 border-zinc-700/40 shrink-0">
            simple
          </span>
        )}

        {hazard.stealth_dc != null && (
          <span className="text-xs text-muted-foreground shrink-0">
            Stealth {hazard.stealth_dc}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {/* Stat line: AC / Hardness / HP */}
          <div className="flex flex-wrap gap-3 text-xs">
            {hazard.ac != null && (
              <span>
                <span className="text-muted-foreground">AC </span>
                <span className="font-semibold">{hazard.ac}</span>
              </span>
            )}
            {hazard.hardness != null && hazard.hardness > 0 && (
              <span>
                <span className="text-muted-foreground">Hardness </span>
                <span className="font-semibold">{hazard.hardness}</span>
              </span>
            )}
            {hazard.has_health && hazard.hp != null && (
              <span>
                <span className="text-muted-foreground">HP </span>
                <span className="font-semibold text-green-400">{hazard.hp}</span>
              </span>
            )}
          </div>

          {/* Stealth details */}
          {stealthText && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">Stealth: </span>
              <SafeHtml as="span" html={stealthText} className="inline" />
            </p>
          )}

          {/* Description */}
          {descriptionText && (
            <SafeHtml html={descriptionText} className="text-xs text-foreground/80 leading-relaxed" />
          )}

          {/* Disable */}
          {disableText && (
            <div>
              <p className="text-xs font-semibold text-amber-300/80 mb-0.5">Disable</p>
              <SafeHtml html={disableText} className="text-xs text-foreground/80 leading-relaxed" />
            </div>
          )}

          {/* Reset */}
          {resetText && (
            <div>
              <p className="text-xs font-semibold text-blue-300/80 mb-0.5">Reset</p>
              <SafeHtml html={resetText} className="text-xs text-foreground/80 leading-relaxed" />
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="space-y-1.5">
              {actions.map((action, i) => {
                const ruDescription = isRu ? itemDescByName.get(action.name.toLowerCase()) : undefined
                const desc = ruDescription ?? action.description
                return (
                  <div key={i} className="rounded bg-secondary/40 px-2 py-1.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {ACTION_TYPE_LABEL[action.actionType] ?? '●'}
                      </span>
                      <span className="text-xs font-semibold">{action.name}</span>
                    </div>
                    {desc && (
                      ruDescription
                        ? <SafeHtml html={desc} className="text-xs text-foreground/70 leading-relaxed" />
                        : <p className="text-xs text-foreground/70 leading-relaxed">{sanitize(desc)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Traits */}
          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground uppercase tracking-wide"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {hazard.source_book && (
            <p className="text-[10px] text-muted-foreground/60 italic">{hazard.source_book}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function HazardsPage() {
  const [allHazards, setAllHazards] = useState<HazardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAllHazards()
      .then(setAllHazards)
      .catch(logError('load-hazards'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = allHazards
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((h) => h.name.toLowerCase().includes(q) || (h.name_loc?.toLowerCase().includes(q) ?? false))
    }
    if (typeFilter !== 'all') {
      list = list.filter((h) => h.hazard_type === typeFilter)
    }
    return list
  }, [allHazards, query, typeFilter])

  const TYPE_TABS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'simple', label: 'Simple' },
    { value: 'complex', label: 'Complex' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
        <SearchInput
          placeholder="Search hazards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />

        <div className="flex gap-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded border font-semibold transition-colors',
                typeFilter === tab.value
                  ? 'text-foreground bg-secondary border-border'
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
            : `${filtered.length} hazard${filtered.length !== 1 ? 's' : ''}`}
          {(query || typeFilter !== 'all') && !loading && (
            <button
              onClick={() => { setQuery(''); setTypeFilter('all') }}
              className="ml-2 text-primary hover:underline"
            >
              clear
            </button>
          )}
        </p>
      </div>

      {/* Hazard list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {allHazards.length === 0
                ? 'Run sync to import hazards'
                : 'No hazards match the filters'}
            </p>
          </div>
        )}
        {filtered.map((hazard) => (
          <HazardCard
            key={hazard.id}
            hazard={hazard}
            expanded={expandedId === hazard.id}
            onToggle={() => setExpandedId((prev) => (prev === hazard.id ? null : hazard.id))}
          />
        ))}
      </div>
    </div>
  )
}
