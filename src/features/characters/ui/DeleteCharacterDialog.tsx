import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import type { CharacterRecord } from '@/shared/api'
import { useTranslation } from 'react-i18next'

interface DeleteCharacterDialogProps {
  target: CharacterRecord | null
  onConfirm: (id: string) => void
  onCancel: () => void
}

export function DeleteCharacterDialog({ target, onConfirm, onCancel }: DeleteCharacterDialogProps) {
  const { t } = useTranslation('common')
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteCharacter.title', { name: target?.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteCharacter.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('deleteCharacter.keep')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => target && onConfirm(target.id)}
          >
            {t('deleteCharacter.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
