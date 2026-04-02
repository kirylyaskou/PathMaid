import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'main' },
  { href: '/combat', icon: Swords, label: 'Combat Tracker', section: 'main' },
  { href: '/encounters', icon: Map, label: 'Encounters', section: 'main' },
  { href: '/bestiary', icon: BookOpen, label: 'Bestiary', section: 'reference' },
  { href: '/actions', icon: Zap, label: 'Actions', section: 'reference' },
  { href: '/spells', icon: Sparkles, label: 'Spells', section: 'reference' },
  { href: '/items', icon: Package, label: 'Items', section: 'reference' },
  { href: '/conditions', icon: Activity, label: 'Conditions', section: 'reference' },
  { href: '/hazards', icon: AlertTriangle, label: 'Hazards', section: 'reference' },
  { href: '/settings', icon: Settings, label: 'Settings', section: 'settings' },
]

interface AppSidebarProps {
  onSearchOpen?: () => void
}

export function AppSidebar({ onSearchOpen }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-14 px-4 border-b border-sidebar-border relative',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/90">
            <Swords className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground tracking-tight text-sm">
              PathBuddy
            </span>
          )}
        </div>

        {/* Search Button */}
        <div className="px-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  collapsed && 'justify-center px-2'
                )}
                onClick={onSearchOpen}
              >
                <Search className="w-4 h-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm">Search...</span>
                    <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/50">
                      Ctrl+K
                    </kbd>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>Search (Ctrl+K)</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Navigation - Grouped */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {/* Main tools */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
                Tools
              </p>
            )}
            {navItems.filter(i => i.section === 'main').map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-primary/15 text-primary border-l-2 border-primary'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive && 'text-primary'
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>

          {/* Reference */}
          <div className="space-y-1 mt-4">
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
                Reference
              </p>
            )}
            {navItems.filter(i => i.section === 'reference').map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-primary/15 text-primary border-l-2 border-primary'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive && 'text-primary'
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>

          {/* Settings */}
          <div className="space-y-1 mt-4">
            {navItems.filter(i => i.section === 'settings').map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-primary/15 text-primary border-l-2 border-primary'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive && 'text-primary'
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  collapsed ? 'justify-center' : 'justify-between'
                )}
                onClick={() => setCollapsed(!collapsed)}
              >
                {!collapsed && <span className="text-xs">Collapse</span>}
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>Expand sidebar</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
