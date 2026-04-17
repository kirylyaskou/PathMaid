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

export const NAV_ITEMS = [
  { href: '/',                 icon: LayoutDashboard, label: 'Dashboard',        section: 'main' },
  { href: '/combat',           icon: Swords,          label: 'Combat Tracker',   section: 'main' },
  { href: '/encounters',       icon: Map,             label: 'Encounters',       section: 'main' },
  { href: '/characters',       icon: Users,           label: 'Characters',       section: 'main' },
  { href: '/bestiary',         icon: BookOpen,        label: 'Bestiary',         section: 'reference' },
  { href: '/actions',          icon: Zap,             label: 'Actions',          section: 'reference' },
  { href: '/spells',           icon: Sparkles,        label: 'Spells',           section: 'reference' },
  { href: '/items',            icon: Package,         label: 'Items',            section: 'reference' },
  { href: '/conditions',       icon: Activity,        label: 'Conditions',       section: 'reference' },
  { href: '/hazards',          icon: AlertTriangle,   label: 'Hazards',          section: 'reference' },
  { href: '/custom-creatures', icon: Hammer,          label: 'Custom Creatures', section: 'reference' },
  { href: '/settings',         icon: Settings,        label: 'Settings',         section: 'settings' },
] as const
