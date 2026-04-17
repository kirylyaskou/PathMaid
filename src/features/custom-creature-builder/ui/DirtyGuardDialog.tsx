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

interface Props {
  onKeepEditing: () => void
  onDiscard: () => void
}

/**
 * Role swap rationale (D-26):
 * UI-SPEC says "Keep editing" is default/primary and "Discard changes" is destructive.
 * Radix AlertDialog's ESC → triggers Cancel, so we mount:
 *   - Keep editing as AlertDialogAction (default focus)
 *   - Discard changes as AlertDialogCancel (destructive styling)
 * This way ESC = Keep editing (matches user intent after accidental nav).
 * Semantic roles of Action/Cancel are DELIBERATELY swapped from Radix defaults.
 */
export function DirtyGuardDialog({ onKeepEditing, onDiscard }: Props) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved edits to this creature. Leaving now will lose them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onKeepEditing}>
            Keep editing
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard changes
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
