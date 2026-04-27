import { useShallow } from 'zustand/react/shallow'
import { useHotkeyStore } from '@/shared/model/hotkey-store'

export function ChordStatusBadge() {
  const { cursorMode, pendingCombo } = useHotkeyStore(
    useShallow((s) => ({ cursorMode: s.cursorMode, pendingCombo: s.pendingCombo }))
  )

  if (cursorMode.type === 'apply-condition') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-lg pointer-events-none">
        → Click combatant: apply {cursorMode.conditionKey} {cursorMode.value}
      </div>
    )
  }

  if (pendingCombo !== null) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium shadow-lg pointer-events-none">
        {pendingCombo}...
      </div>
    )
  }

  return null
}
