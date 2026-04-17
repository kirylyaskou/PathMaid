import { useParams, Link } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { PATHS } from '@/shared/routes'

// Deprecated — replaced by CustomCreaturesEditPage.tsx in plan 59-04.
// Kept as dead code; safe to delete in a future cleanup pass.
export function CustomCreaturesEditPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-sm text-muted-foreground">
          Creature builder placeholder — route wired, UI pending (plan 59-04).
        </p>
        <p className="text-xs font-mono text-muted-foreground/60">id: {id}</p>
        <Button asChild variant="outline" size="sm">
          <Link to={PATHS.CUSTOM_CREATURES}>Back to list</Link>
        </Button>
      </div>
    </div>
  )
}
