import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import { NAV_ITEMS } from '@/shared/config/nav'

const STORAGE_KEY = 'sidebar_collapsed'

interface AppSidebarProps {
  onSearchOpen?: () => void
}

export function AppSidebar({ onSearchOpen }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })
  const { pathname } = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)) } catch {}
  }, [collapsed])

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
            <img className="w-10 h-10"  src='src-tauri\icons\128x128.png'/>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground tracking-tight text-sm">
              PathMaid
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
                    <span className="flex-1 text-left text-sm">{t('sidebar.search')}</span>
                    <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/50">
                      {t('sidebar.searchHint')}
                    </kbd>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>{`${t('sidebar.search')} (${t('sidebar.searchHint')})`}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Navigation - Grouped */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {(['main', 'reference', 'settings'] as const).map((section) => {
            const items = NAV_ITEMS.filter((i) => i.section === section)
            const sectionLabel =
              section === 'main'
                ? t('navSection.tools')
                : section === 'reference'
                  ? t('navSection.reference')
                  : null
            return (
              <div key={section} className="space-y-1 mt-4 first:mt-0">
                {sectionLabel && !collapsed && (
                  <p className="px-3 py-1 text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
                    {sectionLabel}
                  </p>
                )}
                {items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href))
                  const translatedLabel = t(item.labelKey, { defaultValue: item.label })
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
                          <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-primary')} />
                          {!collapsed && <span>{translatedLabel}</span>}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          <p>{translatedLabel}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            )
          })}
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
                {!collapsed && <span className="text-xs">{t('sidebar.collapse')}</span>}
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>{t('sidebar.expand')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
