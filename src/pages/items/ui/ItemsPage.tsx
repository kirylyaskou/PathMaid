import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Star } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { searchItems, getFavoriteIds, toggleFavoriteDb, getItemsByIds } from '@/shared/api'
import type { ItemRow } from '@/shared/api'
import { useItemsCatalogStore, ItemFilterPanel, ItemsTable, FavoritesStar, FavoritesCategoryGroup } from '@/features/items-catalog'
import { ItemReferenceDrawer, ITEM_TYPE_LABELS } from '@/entities/item'
import { useShallow } from 'zustand/react/shallow'
import { logError } from '@/shared/lib/error'
import { MascotWatermark } from '@/shared/ui/mascot-watermark'

const CATEGORY_ORDER = ['weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure', 'backpack', 'kit', 'book', 'effect']

const ITEM_MASCOT: Record<string, string> = {
  weapon: '/mascot/weapons_bg.png',
  armor: '/mascot/armor_bg.png',
  shield: '/mascot/shields_bg.png',
}
const NO_FILTER_MASCOT = '/mascot/no_type_bg.png'

interface FavoritesContentProps {
  favoriteIds: Set<string>
  onItemClick: (id: string) => void
  onToggleFavorite: (id: string) => void
}

function FavoritesContent({ favoriteIds, onItemClick, onToggleFavorite }: FavoritesContentProps) {
  const [favoriteItems, setFavoriteItems] = useState<ItemRow[]>([])

  useEffect(() => {
    const ids = Array.from(favoriteIds)
    getItemsByIds(ids)
      .then(setFavoriteItems)
      .catch(logError('load-favorite-items'))
  }, [favoriteIds])

  const grouped = CATEGORY_ORDER.reduce<Record<string, ItemRow[]>>((acc, cat) => {
    const items = favoriteItems.filter((i) => i.item_type === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(grouped).map(([category, items]) => (
        <FavoritesCategoryGroup
          key={category}
          category={category}
          label={ITEM_TYPE_LABELS[category] ?? category}
          count={items.length}
          items={items}
          onItemClick={onItemClick}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}

export function ItemsPage() {
  const { t } = useTranslation()
  const {
    query, selectedType, minLevel, maxLevel, selectedRarity,
    selectedTraits, selectedSource, selectedSubcategory,
    sortField, sortDir, toggleSort, hasActiveFilters, clearFilters,
  } = useItemsCatalogStore(useShallow((s) => ({
    query: s.query,
    selectedType: s.selectedType,
    minLevel: s.minLevel,
    maxLevel: s.maxLevel,
    selectedRarity: s.selectedRarity,
    selectedTraits: s.selectedTraits,
    selectedSource: s.selectedSource,
    selectedSubcategory: s.selectedSubcategory,
    sortField: s.sortField,
    sortDir: s.sortDir,
    toggleSort: s.toggleSort,
    hasActiveFilters: s.hasActiveFilters,
    clearFilters: s.clearFilters,
  })))

  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')

  // Load favorites on mount
  useEffect(() => {
    getFavoriteIds().then((ids) => setFavoriteIds(new Set(ids))).catch(logError('load-favorite-ids'))
  }, [])

  // Optimistic toggle
  const handleToggleFavorite = useCallback(async (itemId: string) => {
    const wasFavorited = favoriteIds.has(itemId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    await toggleFavoriteDb(itemId, !wasFavorited).catch(logError('toggle-favorite'))
  }, [favoriteIds])

  useEffect(() => {
    setItems([])
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const results = await searchItems(
          query,
          selectedType ?? undefined,
          minLevel ? parseInt(minLevel) : undefined,
          maxLevel ? parseInt(maxLevel) : undefined,
          selectedRarity ?? undefined,
          selectedTraits.length > 0 ? selectedTraits : undefined,
          selectedSource ?? undefined,
          selectedSubcategory ?? undefined,
        )
        setItems(results)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, selectedType, minLevel, maxLevel, selectedRarity, selectedTraits, selectedSource, selectedSubcategory])

  const mascotSrc = activeTab === 'all'
    ? (selectedType ? ITEM_MASCOT[selectedType] : NO_FILTER_MASCOT) ?? null
    : null
  const showMascotFull = activeTab === 'all' && !loading && items.length === 0

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <MascotWatermark src={mascotSrc} full={showMascotFull} />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'all' | 'favorites')}
        className="relative z-10 flex flex-col h-full overflow-hidden"
      >
        <TabsList className="shrink-0 mx-3 mt-2">
          <TabsTrigger value="all">{t('items.tabs.all')}</TabsTrigger>
          <TabsTrigger value="favorites">{t('items.tabs.favorites')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex flex-col flex-1 overflow-hidden mt-0 min-h-0">
          <ItemFilterPanel />

          {/* Count row */}
          <div className="px-3 py-1.5 shrink-0 border-b border-border/30">
            <p className="text-xs text-muted-foreground">
              {loading ? t('items.searching') : t('items.count', { count: items.length })}
              {hasActiveFilters() && (
                <button onClick={clearFilters} className="ml-2 text-primary hover:underline">
                  {t('items.clearFilters')}
                </button>
              )}
            </p>
          </div>

          {/* Table or empty state */}
          {items.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">
                {query || hasActiveFilters()
                  ? t('items.noMatches')
                  : t('items.noData')}
              </p>
              {hasActiveFilters() && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-1">
                  {t('items.clearFiltersBig')}
                </button>
              )}
            </div>
          ) : (
            <ItemsTable
              items={items}
              selectedType={selectedType}
              sortField={sortField}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              onItemClick={setDrawerItemId}
              renderStar={(item) => (
                <FavoritesStar
                  itemId={item.id}
                  isFavorited={favoriteIds.has(item.id)}
                  onToggle={handleToggleFavorite}
                />
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="favorites" className="flex flex-col flex-1 overflow-hidden mt-0">
          {favoriteIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Star className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">{t('items.noFavorites')}</p>
              <p className="text-xs mt-1">{t('items.favoritesHint')}</p>
            </div>
          ) : (
            <FavoritesContent
              favoriteIds={favoriteIds}
              onItemClick={setDrawerItemId}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </TabsContent>
      </Tabs>

      <ItemReferenceDrawer
        itemId={drawerItemId}
        onClose={() => setDrawerItemId(null)}
        extraActions={drawerItemId ? (
          <FavoritesStar
            itemId={drawerItemId}
            isFavorited={favoriteIds.has(drawerItemId)}
            onToggle={handleToggleFavorite}
          />
        ) : undefined}
      />
    </div>
  )
}
