import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Bug, Trash2, RefreshCw, Loader2 } from 'lucide-react'

import { listErrorLogs, clearErrorLogs, type ErrorLogRow, type LogLevel } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { ScrollArea } from '@/shared/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

import { DebugPasswordGate } from './DebugPasswordGate'
import { isDebugUnlocked, unlockDebug, lockDebug } from '../model/debug-auth'

// ISO `YYYY-MM-DD` of a Date, local-time. Used by the date inputs — values are
// compared against the ISO strings stored in created_at (UTC), which is fine
// for the "this day" filter intent.
function toDateInputValue(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: 'bg-destructive/15 text-destructive border-destructive/30',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
}

const POLL_INTERVAL_MS = 5000

export function DebugPage() {
  const { t } = useTranslation('common')
  const [unlocked, setUnlocked] = useState(isDebugUnlocked)
  const [rows, setRows] = useState<ErrorLogRow[]>([])
  const [loading, setLoading] = useState(false)

  // --- filters ---
  const today = useMemo(() => new Date(), [])
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>(toDateInputValue(today))
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [actorFilter, setActorFilter] = useState('')

  const handleUnlock = useCallback(() => {
    unlockDebug()
    setUnlocked(true)
  }, [])

  const handleLock = useCallback(() => {
    lockDebug()
    setUnlocked(false)
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listErrorLogs({
        from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
        level: levelFilter === 'all' ? undefined : levelFilter,
        actor: actorFilter.trim() || undefined,
        limit: 1000,
      })
      setRows(result)
    } catch (err) {
      // Don't recurse into logError here — if logging itself is broken, we must
      // not loop. Surface to the user only.
      toast.error(t('debug.fetchFailed'), { description: String(err) })
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, levelFilter, actorFilter, t])

  useEffect(() => {
    if (!unlocked) return
    void fetchLogs()
    // Re-fetch periodically so freshly logged errors appear without a manual refresh.
    const id = window.setInterval(fetchLogs, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [unlocked, fetchLogs])

  const handleClear = useCallback(async () => {
    try {
      await clearErrorLogs()
      setRows([])
      toast.success(t('debug.cleared'))
    } catch {
      toast.error(t('debug.clearFailed'))
    }
  }, [t])

  // --- derived view data ---
  const total = rows.length
  const errorCount = useMemo(() => rows.filter((r) => r.level === 'error').length, [rows])
  const warnCount = useMemo(() => rows.filter((r) => r.level === 'warn').length, [rows])
  const infoCount = useMemo(() => rows.filter((r) => r.level === 'info').length, [rows])

  if (!unlocked) {
    return <DebugPasswordGate onUnlock={handleUnlock} />
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <DebugHeader
        total={total}
        errorCount={errorCount}
        warnCount={warnCount}
        infoCount={infoCount}
        loading={loading}
        onRefresh={fetchLogs}
        onClear={handleClear}
        onLock={handleLock}
      />

      <DebugFilters
        fromDate={fromDate}
        toDate={toDate}
        levelFilter={levelFilter}
        actorFilter={actorFilter}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onLevelChange={setLevelFilter}
        onActorChange={setActorFilter}
      />

      <DebugTable rows={rows} loading={loading} />
    </div>
  )
}

// --- Sub-components (kept in this file: they're tightly coupled to the page's
// data shape and not reused elsewhere; each is a pure presentational piece). ---

interface DebugHeaderProps {
  total: number
  errorCount: number
  warnCount: number
  infoCount: number
  loading: boolean
  onRefresh: () => void
  onClear: () => void
  onLock: () => void
}

function DebugHeader({
  total,
  errorCount,
  warnCount,
  infoCount,
  loading,
  onRefresh,
  onClear,
  onLock,
}: DebugHeaderProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Bug className="size-5" />
        <h1 className="text-lg font-semibold">{t('debug.title')}</h1>
        <span className="text-muted-foreground text-sm">
          {t('debug.rowCount', { count: total, error: errorCount, warn: warnCount, info: infoCount })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {t('debug.refresh')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onLock}>
          {t('debug.lock')}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="size-4" />
              {t('debug.clear')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('debug.clearConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('debug.clearConfirmDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={onClear}>{t('common.confirm')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

interface DebugFiltersProps {
  fromDate: string
  toDate: string
  levelFilter: LogLevel | 'all'
  actorFilter: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onLevelChange: (v: LogLevel | 'all') => void
  onActorChange: (v: string) => void
}

function DebugFilters({
  fromDate,
  toDate,
  levelFilter,
  actorFilter,
  onFromChange,
  onToChange,
  onLevelChange,
  onActorChange,
}: DebugFiltersProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{t('debug.from')}</span>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-40"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{t('debug.to')}</span>
        <Input
          type="date"
          value={toDate}
          onChange={(e) => onToChange(e.target.value)}
          className="w-40"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{t('debug.level')}</span>
        <Select value={levelFilter} onValueChange={(v) => onLevelChange(v as LogLevel | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('debug.allLevels')}</SelectItem>
            <SelectItem value="error">{t('debug.error')}</SelectItem>
            <SelectItem value="warn">{t('debug.warn')}</SelectItem>
            <SelectItem value="info">{t('debug.info')}</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{t('debug.actor')}</span>
        <Input
          value={actorFilter}
          onChange={(e) => onActorChange(e.target.value)}
          placeholder={t('debug.actorPlaceholder')}
          className="w-56"
        />
      </label>
    </div>
  )
}

interface DebugTableProps {
  rows: ErrorLogRow[]
  loading: boolean
}

function DebugTable({ rows, loading }: DebugTableProps) {
  const { t } = useTranslation('common')

  if (!loading && rows.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
        {t('debug.empty')}
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-24">{t('debug.colLevel')}</TableHead>
            <TableHead className="w-56">{t('debug.colActor')}</TableHead>
            <TableHead className="w-44">{t('debug.colTime')}</TableHead>
            <TableHead>{t('debug.colMessage')}</TableHead>
            <TableHead className="w-1/3">{t('debug.colError')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <DebugLogRow key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

function DebugLogRow({ row }: { row: ErrorLogRow }) {
  const time = useMemo(() => {
    try {
      return new Date(row.created_at).toLocaleString()
    } catch {
      return row.created_at
    }
  }, [row.created_at])

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className={cn('font-mono uppercase', LEVEL_COLORS[row.level])}>
          {row.level}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{row.actor}</TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs">{time}</TableCell>
      <TableCell className="text-sm">{row.message}</TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs whitespace-pre-wrap break-all">
        {row.error_text ?? '—'}
      </TableCell>
    </TableRow>
  )
}
