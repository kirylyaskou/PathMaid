import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { CommandPalette } from './CommandPalette'
import { ChordStatusBadge } from './ChordStatusBadge'
import { RollResultDrawer } from '@/shared/ui/roll-result-drawer'
import { useHotkeyStore } from '@/shared/model/hotkey-store'
import { useChordEngine } from '../model/use-chord-engine'

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  const loadHotkeys = useHotkeyStore((s) => s.loadHotkeys)
  useChordEngine()

  useEffect(() => {
    loadHotkeys()
  }, [loadHotkeys])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar onSearchOpen={() => setCommandOpen(true)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <ChordStatusBadge />
      <RollResultDrawer />
    </div>
  )
}
