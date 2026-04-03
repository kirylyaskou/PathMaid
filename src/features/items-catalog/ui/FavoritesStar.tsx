import { Star } from 'lucide-react'

interface FavoritesStarProps {
  itemId: string
  isFavorited: boolean
  onToggle: (itemId: string) => void
}

export function FavoritesStar({ itemId, isFavorited, onToggle }: FavoritesStarProps) {
  return (
    <button
      className="w-8 h-8 flex items-center justify-center"
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
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
