import { useParams } from 'react-router-dom'
import { CustomItemBuilderPage } from '@/features/custom-item-builder'

export function CustomItemsEditPage() {
  const { id } = useParams()
  if (!id) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Custom item id is missing.
      </div>
    )
  }
  return <CustomItemBuilderPage itemId={id} />
}
