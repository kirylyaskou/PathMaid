import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getVisibleNavItems } from '@/shared/config'
import { useAdvancedSettingsStore } from '@/shared/model'
import { cn } from '@/shared/lib/utils'

const DESCRIPTION_KEYS: Record<string, string> = {
  '/combat': 'combat',
  '/encounters': 'encounters',
  '/characters': 'characters',
  '/campaigns': 'campaigns',
  '/bestiary': 'bestiary',
  '/actions': 'actions',
  '/spells': 'spells',
  '/items': 'items',
  '/custom-items': 'customItems',
  '/conditions': 'conditions',
  '/hazards': 'hazards',
  '/custom-creatures': 'customCreatures',
  '/settings': 'settings',
}

export function DashboardPage() {
  const { t } = useTranslation('common')
  const customContentEnabled = useAdvancedSettingsStore((s) => s.customContent)
  const navItems = useMemo(
    () => getVisibleNavItems(customContentEnabled).filter((item) => item.href !== '/'),
    [customContentEnabled],
  )

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="grid min-h-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] auto-rows-[minmax(168px,1fr)] gap-3">
        {navItems.map((item) => {
          const label = t(item.labelKey, { defaultValue: item.label })
          const descriptionKey = DESCRIPTION_KEYS[item.href]
          const description = descriptionKey
            ? t(`pages.dashboard.navDescription.${descriptionKey}`)
            : ''
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex min-h-0 flex-col justify-between rounded-lg border border-border/70 bg-secondary/25 p-4 text-foreground transition-colors',
                'hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-md border border-border/70 bg-background/45 text-primary transition-colors group-hover:border-primary/60 group-hover:bg-primary/15">
                <item.icon className="h-8 w-8" />
              </span>
              <span className="space-y-1.5">
                <span className="block text-base font-semibold leading-tight">{label}</span>
                <span className="block text-sm leading-snug text-muted-foreground">{description}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
