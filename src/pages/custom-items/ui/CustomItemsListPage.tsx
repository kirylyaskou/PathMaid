import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, PackagePlus, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PATHS } from '@/shared/routes'
import {
  createCustomItem,
  deleteCustomItem,
  listCustomItems,
  searchCustomItems,
} from '@/shared/api'
import type { CustomItemRow } from '@/shared/api'
import { ITEM_TYPE_COLORS, formatCustomItemSubtitle } from '@/entities/item'
import { cn } from '@/shared/lib/utils'
import { CloneFromItemDialog } from '@/features/custom-item-builder'

function CustomItemRowView({
  item,
  onOpen,
  onDelete,
}: {
  item: CustomItemRow
  onOpen: () => void
  onDelete: () => void
}) {
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'

  return (
    <div className="flex items-center gap-3 border-b border-border/25 px-3 py-2 hover:bg-secondary/25">
      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', typeColor)}>
        {item.item_type[0]?.toUpperCase() ?? '?'}
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <span className="block truncate text-sm font-medium hover:text-primary hover:underline">{item.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{formatCustomItemSubtitle(item)}</span>
      </button>
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}

export function CustomItemsListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomItemRow[]>([])
  const [query, setQuery] = useState('')
  const [cloneOpen, setCloneOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      void (async () => {
        const rows = query.trim() ? await searchCustomItems(query) : await listCustomItems()
        if (!cancelled) {
          setItems(rows)
          setLoading(false)
        }
      })()
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  async function createBlank() {
    const id = await createCustomItem()
    navigate(PATHS.CUSTOM_ITEM_EDIT(id))
  }

  async function removeItem(item: CustomItemRow) {
    await deleteCustomItem(item.id)
    setItems((prev) => prev.filter((entry) => entry.id !== item.id))
    toast('Custom item deleted')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Custom Items</h1>
          <p className="text-xs text-muted-foreground">Local Pathmaid-only item library</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCloneOpen(true)}>
            <Copy className="h-4 w-4" /> Clone
          </Button>
          <Button size="sm" onClick={() => void createBlank()}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      <div className="relative shrink-0 border-b border-border/30 p-3">
        <Search className="pointer-events-none absolute left-6 top-5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          placeholder="Search custom items..."
        />
      </div>

      {items.length === 0 && !loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <PackagePlus className="h-9 w-9 opacity-60" />
          <p className="text-sm">No custom items yet.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.map((item) => (
            <CustomItemRowView
              key={item.id}
              item={item}
              onOpen={() => navigate(PATHS.CUSTOM_ITEM_EDIT(item.id))}
              onDelete={() => void removeItem(item)}
            />
          ))}
        </div>
      )}

      <CloneFromItemDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onCloned={(id) => navigate(PATHS.CUSTOM_ITEM_EDIT(id))}
      />
    </div>
  )
}
