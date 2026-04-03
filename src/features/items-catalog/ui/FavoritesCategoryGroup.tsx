import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui/collapsible'
import type { ItemRow } from '@/shared/api'
import { ItemTableRow } from './ItemTableRow'
import { FavoritesStar } from './FavoritesStar'

interface FavoritesCategoryGroupProps {
  category: string
  label: string
  count: number
  items: ItemRow[]
  onItemClick: (id: string) => void
  favoriteIds: Set<string>
  onToggleFavorite: (id: string) => void
}

export function FavoritesCategoryGroup({
  label,
  count,
  items,
  onItemClick,
  favoriteIds,
  onToggleFavorite,
}: FavoritesCategoryGroupProps) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full h-10 px-3 bg-secondary/40 border-b border-border/30 hover:bg-secondary/60 transition-colors">
        <span className="text-sm font-medium">{label} ({count})</span>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {items.map((item) => (
          <ItemTableRow
            key={item.id}
            item={item}
            onNameClick={onItemClick}
            starSlot={
              <FavoritesStar
                itemId={item.id}
                isFavorited={favoriteIds.has(item.id)}
                onToggle={onToggleFavorite}
              />
            }
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
