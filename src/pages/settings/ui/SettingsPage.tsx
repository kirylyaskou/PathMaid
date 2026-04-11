import { useState, useEffect, useCallback } from 'react'
import { syncFoundryData, importLocalPacks, getSyncMetadata } from '@/shared/api'
import { useCombatTrackerStore } from '@/features/combat-tracker'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { Separator } from '@/shared/ui/separator'
import { MascotHex } from '@/shared/ui/mascot-hex'
import { RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsPage() {
  const [syncing, setSyncing] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [entityCount, setEntityCount] = useState<string | null>(null)

  const loadSyncStatus = useCallback(async () => {
    try {
      const date = await getSyncMetadata('last_sync_date')
      const count = await getSyncMetadata('entity_count')
      setLastSync(date)
      setEntityCount(count)
    } catch {
      // Metadata table may not exist before first migration
    }
  }, [])

  useEffect(() => {
    loadSyncStatus()
  }, [loadSyncStatus])

  const handleSync = async () => {
    setSyncing(true)
    setStage('Starting sync...')
    setProgress(null)
    try {
      const count = await syncFoundryData((stageText, current, total) => {
        setStage(stageText)
        if (total > 0) setProgress({ current, total })
      })
      toast.success(
        `Sync complete — ${count.toLocaleString()} entities imported.`
      )
      useCombatTrackerStore.getState().bumpEntityDataVersion()
      await loadSyncStatus()
    } catch (err) {
      console.error('[Sync] Failed:', err)
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
      toast.error(`Sync failed — ${msg}. Try again.`)
    } finally {
      setSyncing(false)
      setStage('')
      setProgress(null)
    }
  }

  const handleLocalImport = async () => {
    setSyncing(true)
    setStage('Importing local packs...')
    setProgress(null)
    try {
      const count = await importLocalPacks(
        'refs/pf2e',
        (stageText, current, total) => {
          setStage(stageText)
          if (total > 0) setProgress({ current, total })
        }
      )
      toast.success(
        `Import complete — ${count.toLocaleString()} entities imported.`
      )
      useCombatTrackerStore.getState().bumpEntityDataVersion()
      await loadSyncStatus()
    } catch (err) {
      console.error('[Import] Failed:', err)
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
      toast.error(`Import failed — ${msg}. Try again.`)
    } finally {
      setSyncing(false)
      setStage('')
      setProgress(null)
    }
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : undefined

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <>
      {syncing && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black"
          aria-live="polite"
          role="status"
        >
          <MascotHex height={260} />
          <h2 className="text-xl font-semibold text-foreground">
            Подготавливаем бардак
          </h2>
          <p className="text-sm text-muted-foreground">{stage}</p>
          <Progress
            value={progressPercent}
            className="h-2 w-64"
            aria-label="Sync progress"
          />
        </div>
      )}
      <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      <Separator className="my-6" />

      <section>
        <h2 className="text-xl font-semibold text-foreground">Data Source</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Import latest Foundry VTT PF2e data from GitHub. Replaces existing
          entities.
        </p>

        <div className="mt-4 flex gap-3">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync Foundry VTT Data'}
          </Button>

          <Button
            variant="outline"
            onClick={handleLocalImport}
            disabled={syncing}
          >
            Import Local (refs/)
          </Button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {lastSync && entityCount
            ? `Last synced: ${formatDate(lastSync)} — ${Number(entityCount).toLocaleString()} entities`
            : 'No data imported yet. Run a sync to load entities.'}
        </p>
      </section>
    </div>
    </>
  )
}
