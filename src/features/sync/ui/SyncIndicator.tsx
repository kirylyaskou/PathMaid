import { RefreshCw, CloudOff, Check, AlertCircle, Cloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import { useSync } from '@/features/sync'

type TFunc = ReturnType<typeof useTranslation>['t']

function formatRelative(iso: string | null, t: TFunc): string {
  if (!iso) return t('sync.never')
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return t('sync.justNow')
  if (mins < 60) return t('sync.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('sync.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('sync.daysAgo', { count: days })
}

/**
 * Header sync indicator.
 *
 * Renders a compact icon reflecting sync status and acts as the manual
 * "sync now" trigger. When cloud is unconfigured or the user is not
 * authenticated, it is a no-op placeholder (still rendered for layout
 * stability) that links the user toward the account menu via tooltip text.
 */
export function SyncIndicator() {
  const { t } = useTranslation()
  const sync = useSync()

  // Hidden entirely when cloud is not configured — no point showing a sync
  // affordance that can never work. Keeps the header clean for local-only users.
  if (!sync.cloudConfigured) return null

  if (!sync.authenticated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8 opacity-50" disabled>
            <CloudOff className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('sync.signInToSync')}</TooltipContent>
      </Tooltip>
    )
  }

  const isBusy = sync.status === 'syncing'
  const Icon = isBusy
    ? RefreshCw
    : sync.status === 'error'
      ? AlertCircle
      : sync.status === 'synced'
        ? Check
        : Cloud

  const colorClass =
    sync.status === 'error'
      ? 'text-destructive'
      : sync.status === 'synced'
        ? 'text-emerald-500'
        : ''

  const tooltipText = isBusy
    ? t('sync.syncing')
    : sync.status === 'error'
      ? `${t('sync.error')}: ${sync.lastError ?? ''}`
      : t('sync.lastSync', { when: formatRelative(sync.lastSyncAt, t) })

  const handleClick = async () => {
    if (isBusy || !sync.canSync) return
    try {
      const result = await sync.syncNow()
      if (result.errors.length > 0) {
        toast.error(t('sync.syncedWithErrors', { count: result.errors.length }))
      } else {
        toast.success(
          t('sync.syncedSummary', {
            pulled: result.applied,
            pushed: result.pushed + result.deleted,
          }),
        )
      }
    } catch {
      toast.error(t('sync.errors.unknown'))
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={handleClick}
          disabled={isBusy || !sync.canSync}
          aria-label={t('sync.syncNow')}
        >
          <Icon className={`h-4 w-4 ${colorClass} ${isBusy ? 'animate-spin' : ''}`} />
          <span className="sr-only">{t('sync.syncNow')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  )
}
