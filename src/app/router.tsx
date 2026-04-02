import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/widgets/app-shell'
import { DashboardPage } from '@/pages/dashboard'
import { CombatPage } from '@/pages/combat'
import { BestiaryPage } from '@/pages/bestiary'
import { EncountersPage } from '@/pages/encounters'
import { ActionsPage } from '@/pages/actions'
import { ConditionsPage } from '@/pages/conditions'
import { HazardsPage } from '@/pages/hazards'
import { SpellsPage } from '@/pages/spells'
import { ItemsPage } from '@/pages/items'
import { SettingsPage } from '@/pages/settings'
import { PATHS } from '@/shared/routes'

const router = createHashRouter([
  {
    path: PATHS.HOME,
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'combat', element: <CombatPage /> },
      { path: 'bestiary', element: <BestiaryPage /> },
      { path: 'encounters', element: <EncountersPage /> },
      { path: 'actions', element: <ActionsPage /> },
      { path: 'conditions', element: <ConditionsPage /> },
      { path: 'hazards', element: <HazardsPage /> },
      { path: 'spells', element: <SpellsPage /> },
      { path: 'items', element: <ItemsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
