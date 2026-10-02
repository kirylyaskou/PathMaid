import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraggable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { getAllHazards, type HazardRow } from '@/shared/api'
import { logErrorWithToast } from '@/shared/lib/error'
import { SearchInput } from '@/shared/ui/search-input'
import { LevelBadge } from '@/shared/ui/level-badge'

function HazardResult({ hazard, onAdd }: { hazard: HazardRow; onAdd: (hazard: HazardRow) => void }) {
  const { t } = useTranslation('common')
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `combat-hazard-${hazard.id}`,
    data: { type: 'hazard-add' as const, hazardRow: hazard },
  })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 rounded-md bg-secondary/30 px-2 py-1.5 hover:bg-secondary/50">
      <LevelBadge level={hazard.level} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{hazard.name_loc ?? hazard.name}</span>
      <span className="text-[10px] text-muted-foreground">
        {t(hazard.is_complex ? 'encounterBuilder.chipComplex' : 'encounterBuilder.chipSimple')}
      </span>
      <button type="button" className="rounded p-1 text-muted-foreground hover:text-primary"
        aria-label={t('encounterBuilder.addChip')} onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onAdd(hazard)}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

export function HazardSearchPanel({ onAdd }: { onAdd: (hazard: HazardRow) => void }) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [hazards, setHazards] = useState<HazardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllHazards().then(setHazards).catch(logErrorWithToast('hazard-search-load'))
      .finally(() => setLoading(false))
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return hazards.filter((hazard) => !q || hazard.name.toLowerCase().includes(q)
      || hazard.name_loc?.toLowerCase().includes(q)).slice(0, 50)
  }, [hazards, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/50 p-2">
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder={t('encounterBuilder.searchHazardsPlaceholder')} className="h-8 text-sm" />
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {loading && <p className="py-4 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
        {!loading && results.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {hazards.length ? t('encounterBuilder.noHazardsFound') : t('encounterBuilder.runSyncToImport')}
          </p>
        )}
        {results.map((hazard) => <HazardResult key={hazard.id} hazard={hazard} onAdd={onAdd} />)}
      </div>
    </div>
  )
}
