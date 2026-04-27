import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FavoritesStarProps {
  itemId: string
  isFavorited: boolean
  onToggle: (itemId: string) => void
}

export function FavoritesStar({ itemId, isFavorited, onToggle }: FavoritesStarProps) {
  const { t } = useTranslation('common')
  return (
    <button
      className="w-8 h-8 flex items-center justify-center"
      aria-label={isFavorited ? t('items.favorites.removeFromFavorites') : t('items.favorites.addToFavorites')}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(itemId)
      }}
    >
      {isFavorited ? (
        <Star className="w-4 h-4 fill-current text-pf-gold" />
      ) : (
        <Star className="w-4 h-4 text-muted-foreground/40 hover:text-pf-gold transition-colors" />
      )}
    </button>
  )
}
