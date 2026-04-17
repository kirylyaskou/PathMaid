import { useParams, Navigate } from 'react-router-dom'
import { BuilderPage } from '@/features/custom-creature-builder/ui/BuilderPage'
import { PATHS } from '@/shared/routes'

export function CustomCreaturesEditPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to={PATHS.CUSTOM_CREATURES} replace />
  return <BuilderPage creatureId={id} />
}
