import {
  LayoutDashboard,
  Swords,
  BookOpen,
  Sparkles,
  Package,
  Activity,
  AlertTriangle,
  Zap,
  Map,
  Users,
  Settings,
  Hammer,
} from 'lucide-react'

/**
 * Navigation items.
 *
 * `label` = English default (fallback when no translation exists).
 * `labelKey` = i18n key for react-i18next (`nav.<camelCase>` in common.json).
 *
 * Rendering code should prefer `t(labelKey)` and fall back to `label`.
 */
export const NAV_ITEMS = [
  { href: '/',                 icon: LayoutDashboard, label: 'Dashboard',        labelKey: 'nav.dashboard',       section: 'main' },
  { href: '/combat',           icon: Swords,          label: 'Combat Tracker',   labelKey: 'nav.combatTracker',   section: 'main' },
  { href: '/encounters',       icon: Map,             label: 'Encounters',       labelKey: 'nav.encounters',      section: 'main' },
  { href: '/characters',       icon: Users,           label: 'Characters',       labelKey: 'nav.characters',      section: 'main' },
  { href: '/bestiary',         icon: BookOpen,        label: 'Bestiary',         labelKey: 'nav.bestiary',        section: 'reference' },
  { href: '/actions',          icon: Zap,             label: 'Actions',          labelKey: 'nav.actions',         section: 'reference' },
  { href: '/spells',           icon: Sparkles,        label: 'Spells',           labelKey: 'nav.spells',          section: 'reference' },
  { href: '/items',            icon: Package,         label: 'Items',            labelKey: 'nav.items',           section: 'reference' },
  { href: '/conditions',       icon: Activity,        label: 'Conditions',       labelKey: 'nav.conditions',      section: 'reference' },
  { href: '/hazards',          icon: AlertTriangle,   label: 'Hazards',          labelKey: 'nav.hazards',         section: 'reference' },
  { href: '/custom-creatures', icon: Hammer,          label: 'Custom Creatures', labelKey: 'nav.customCreatures', section: 'reference' },
  { href: '/settings',         icon: Settings,        label: 'Settings',         labelKey: 'nav.settings',        section: 'settings' },
] as const
