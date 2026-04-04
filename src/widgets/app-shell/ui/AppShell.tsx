import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { CommandPalette } from './CommandPalette'
import { RollResultDrawer } from '@/shared/ui/roll-result-drawer'

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)

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
      <RollResultDrawer />
    </div>
  )
}
