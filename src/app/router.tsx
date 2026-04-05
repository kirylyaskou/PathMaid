import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AppShell } from '@/widgets/app-shell'
import { PATHS } from '@/shared/routes'

const DashboardPage  = lazy(() => import('@/pages/dashboard').then(m => ({ default: m.DashboardPage })))
const CombatPage     = lazy(() => import('@/pages/combat').then(m => ({ default: m.CombatPage })))
const BestiaryPage   = lazy(() => import('@/pages/bestiary').then(m => ({ default: m.BestiaryPage })))
const EncountersPage = lazy(() => import('@/pages/encounters').then(m => ({ default: m.EncountersPage })))
const ActionsPage    = lazy(() => import('@/pages/actions').then(m => ({ default: m.ActionsPage })))
const ConditionsPage = lazy(() => import('@/pages/conditions').then(m => ({ default: m.ConditionsPage })))
const HazardsPage    = lazy(() => import('@/pages/hazards').then(m => ({ default: m.HazardsPage })))
const SpellsPage     = lazy(() => import('@/pages/spells').then(m => ({ default: m.SpellsPage })))
const ItemsPage      = lazy(() => import('@/pages/items').then(m => ({ default: m.ItemsPage })))
const SettingsPage   = lazy(() => import('@/pages/settings').then(m => ({ default: m.SettingsPage })))

function SuspenseOutlet() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Outlet />
    </Suspense>
  )
}

const router = createHashRouter([
  {
    path: PATHS.HOME,
    element: <AppShell />,
    children: [
      {
        element: <SuspenseOutlet />,
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
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
