import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { searchItems, type ItemRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import type { EncounterLootEntry } from '../lib/types'
import type { EncounterLootEntryPatch } from '../model/use-encounter-loot'

interface AdditionalLootEditorProps {
  entries: EncounterLootEntry[]
  className?: string
  disabled?: boolean
  onAdd: (patch: EncounterLootEntryPatch) => void
  onUpdate: (entry: EncounterLootEntry, patch: EncounterLootEntryPatch) => void
  onDelete: (entryId: string) => void
}

const ITEM_TYPES = ['weapon', 'armor', 'shield', 'consumable', 'treasure', 'equipment', 'backpack']
const SEARCH_LIMIT = 8

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toCatalogPatch(item: ItemRow): EncounterLootEntryPatch {
  return {
    itemId: item.id,
    name: item.name,
    itemType: item.item_type,
    quantity: 1,
    priceGp: item.price_gp,
    bulk: item.bulk,
    notes: item.name_loc,
  }
}

interface EntryRowProps {
  entry: EncounterLootEntry
  disabled?: boolean
  onUpdate: (entry: EncounterLootEntry, patch: EncounterLootEntryPatch) => void
  onDelete: (entryId: string) => void
}

interface EntryDraft {
  name: string
  itemType: string
  quantity: string
  priceGp: string
  bulk: string
  notes: string
}

function entryDraft(entry: EncounterLootEntry): EntryDraft {
  return {
    name: entry.name,
    itemType: entry.itemType ?? 'equipment',
    quantity: String(entry.quantity),
    priceGp: entry.priceGp?.toString() ?? '',
    bulk: entry.bulk ?? '',
    notes: entry.notes ?? '',
  }
}

function EntryRow({ entry, disabled = false, onUpdate, onDelete }: EntryRowProps) {
  const [draft, setDraft] = useState<EntryDraft>(() => entryDraft(entry))

  useEffect(() => {
    setDraft(entryDraft(entry))
  }, [entry])

  const commitDraft = useCallback((nextDraft = draft) => {
    onUpdate(entry, {
      name: nextDraft.name,
      itemType: nextDraft.itemType,
      quantity: Math.max(1, Number(nextDraft.quantity) || 1),
      priceGp: toNumberOrNull(nextDraft.priceGp),
      bulk: nextDraft.bulk.trim() || null,
      notes: nextDraft.notes.trim() || null,
    })
  }, [draft, entry, onUpdate])

  const handleTypeChange = useCallback((value: string) => {
    const nextDraft = { ...draft, itemType: value }
    setDraft(nextDraft)
    commitDraft(nextDraft)
  }, [commitDraft, draft])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.currentTarget.blur()
  }, [])

  const handleDelete = useCallback(() => {
    onDelete(entry.id)
  }, [entry.id, onDelete])

  return (
    <div className="grid grid-cols-[minmax(12rem,1fr)_8rem_5rem_6rem_5rem_auto] gap-2 rounded-md border border-border/50 bg-card p-2">
      <Input
        value={draft.name}
        className="h-8 text-sm"
        onBlur={() => commitDraft()}
        onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
        onKeyDown={handleKeyDown}
      />
      <Select value={draft.itemType} disabled={disabled} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEM_TYPES.map((type) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={1}
        value={draft.quantity}
        className="h-8 font-mono text-xs"
        onBlur={() => commitDraft()}
        onChange={(event) => setDraft((prev) => ({ ...prev, quantity: event.target.value }))}
        onKeyDown={handleKeyDown}
      />
      <Input
        type="number"
        min={0}
        step="0.01"
        value={draft.priceGp}
        className="h-8 font-mono text-xs"
        placeholder="gp"
        onBlur={() => commitDraft()}
        onChange={(event) => setDraft((prev) => ({ ...prev, priceGp: event.target.value }))}
        onKeyDown={handleKeyDown}
      />
      <Input
        value={draft.bulk}
        className="h-8 font-mono text-xs"
        placeholder="bulk"
        onBlur={() => commitDraft()}
        onChange={(event) => setDraft((prev) => ({ ...prev, bulk: event.target.value }))}
        onKeyDown={handleKeyDown}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        disabled={disabled}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Textarea
        value={draft.notes}
        className="col-span-full min-h-16 text-xs"
        placeholder="Notes"
        onBlur={() => commitDraft()}
        onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
      />
    </div>
  )
}

export function AdditionalLootEditor({
  entries,
  className,
  disabled = false,
  onAdd,
  onUpdate,
  onDelete,
}: AdditionalLootEditorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [freeformName, setFreeformName] = useState('')

  useEffect(() => {
    const searchTerm = query.trim()
    if (searchTerm.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchItems(searchTerm)
          if (!cancelled) setResults(rows.slice(0, SEARCH_LIMIT))
        } catch {
          if (!cancelled) setResults([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const canAddFreeform = useMemo(() => freeformName.trim().length > 0, [freeformName])

  const handleAddFreeform = useCallback(() => {
    if (!canAddFreeform) return
    onAdd({
      itemId: null,
      name: freeformName,
      itemType: 'treasure',
      quantity: 1,
      priceGp: null,
      bulk: null,
      notes: null,
    })
    setFreeformName('')
  }, [canAddFreeform, freeformName, onAdd])

  const handleAddCatalog = useCallback((item: ItemRow) => {
    onAdd(toCatalogPatch(item))
    setQuery('')
    setResults([])
  }, [onAdd])

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
      <div className="grid shrink-0 gap-2 xl:grid-cols-[minmax(22rem,1.2fr)_minmax(18rem,0.9fr)_auto]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            disabled={disabled}
            className="h-9 pl-8"
            placeholder="Search item database"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Input
          value={freeformName}
          disabled={disabled}
          className="h-9"
          placeholder="Freeform loot name"
          onChange={(event) => setFreeformName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAddFreeform()
          }}
        />
        <Button type="button" size="sm" disabled={disabled || !canAddFreeform} onClick={handleAddFreeform}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </div>

      {(loading || results.length > 0) && (
        <div className="shrink-0 rounded-md border border-border/50 bg-muted/20 p-2">
          {loading && <div className="px-2 py-1 text-xs text-muted-foreground">Searching...</div>}
          <div className="grid max-h-56 gap-1 overflow-y-auto pr-1 scrollbar-thin">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                className="flex min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary/60 disabled:opacity-60"
                onClick={() => handleAddCatalog(item)}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">L{item.level} · {item.item_type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 pr-3">
        <div className="space-y-2">
          {entries.length === 0 && (
            <div className="rounded-md border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              No additional loot.
            </div>
          )}
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              disabled={disabled}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
