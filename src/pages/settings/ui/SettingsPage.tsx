import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  syncFoundryData,
  importLocalPacks,
  getSyncMetadata,
  checkForUpdate,
  isDarwin,
  openReleasesPage,
  recordError,
} from '@/shared/api'
import { useAdvancedSettingsStore, useUpdaterStore } from '@/shared/model'
import { useCombatTrackerStore } from '@/features/combat-tracker'
import { seedSampleCampaign } from '@/features/campaign-manager'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { Separator } from '@/shared/ui/separator'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { MascotHex } from '@/shared/ui/mascot-hex'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui/collapsible'
import { Download, RefreshCw, Loader2, ChevronDown, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { getVersion } from '@tauri-apps/api/app'

import { HotkeysSection } from './HotkeysSection'
import oglFullText from '/LICENSES/OGL-1.0a.txt?raw'
import section15Text from '/LICENSES/OGL-SECTION-15.md?raw'
import vendorVersionTxt from '/vendor/pf2e-locale-ru/VERSION.txt?raw'

export function SettingsPage() {
  const { t } = useTranslation('common')
  const [syncing, setSyncing] = useState(false)
  const [stage, setStage] = useState('')
  const [seedingCampaign, setSeedingCampaign] = useState(false)
  const [progress, setProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [entityCount, setEntityCount] = useState<string | null>(null)

  // --- Updater section state ---
  const [currentVersion, setCurrentVersion] = useState<string>('—')
  const darwin = isDarwin() // sync — safe in render, no useEffect needed

  useEffect(() => {
    getVersion()
      .then(setCurrentVersion)
      .catch(() => setCurrentVersion('неизвестно'))
  }, [])

  const { updaterStatus, updaterError } = useUpdaterStore(
    useShallow((s) => ({
      updaterStatus: s.status,
      updaterError: s.error,
    })),
  )

  const handleCheckForUpdate = async () => {
    const store = useUpdaterStore.getState()
    store.setChecking()
    try {
      const update = await checkForUpdate()
      if (update) {
        store.setAvailable(update)
      } else {
        store.setUpToDate()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setError(msg)
      toast.error(`${t('settings.updaterStatus.checkFailedPrefix')}: ${msg}`)
    }
  }

  const statusLine = (
    s: typeof updaterStatus,
    err: string | null,
  ): string => {
    switch (s) {
      case 'checking':
        return t('settings.updaterStatus.checking')
      case 'available':
        return t('settings.updaterStatus.available')
      case 'downloading':
        return t('settings.updaterStatus.downloading')
      case 'installing':
        return t('settings.updaterStatus.installing')
      case 'uptodate':
        return t('settings.updaterStatus.uptodate')
      case 'error':
        return `${t('settings.updaterStatus.errorPrefix')}: ${err ?? '—'}`
      case 'idle':
      default:
        return ''
    }
  }

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
      toast.success(t('toast.sync.success', { count: count.toLocaleString() }))
      useCombatTrackerStore.getState().bumpEntityDataVersion()
      await loadSyncStatus()
    } catch (err) {
      void recordError('settings.sync', 'Foundry sync failed', err)
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
      toast.error(t('toast.sync.failed', { message: msg }))
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
      toast.success(t('toast.import.success', { count: count.toLocaleString() }))
      useCombatTrackerStore.getState().bumpEntityDataVersion()
      await loadSyncStatus()
    } catch (err) {
      void recordError('settings.import', 'Local pack import failed', err)
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
      toast.error(t('toast.import.failed', { message: msg }))
    } finally {
      setSyncing(false)
      setStage('')
      setProgress(null)
    }
  }

  const handleSeedSampleCampaign = async () => {
    setSeedingCampaign(true)
    try {
      await seedSampleCampaign()
      toast.success('Sample campaign loaded.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
      toast.error(`Sample campaign failed: ${msg}`)
    } finally {
      setSeedingCampaign(false)
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
            {t('settings.preparingMess')}
          </h2>
          <p className="text-sm text-muted-foreground">{stage}</p>
          <Progress
            value={progressPercent}
            className="h-2 w-64"
            aria-label={t('settings.dataSource.syncProgress')}
          />
        </div>
      )}
      <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold text-foreground">{t('settings.title')}</h1>
      <Separator className="my-6" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('settings.tabs.general')}</TabsTrigger>
          <TabsTrigger value="advanced">{t('settings.tabs.advanced')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">{t('settings.dataSource.title')}</h2>
            <p className="mt-2 text-base text-muted-foreground">
              {t('settings.dataSource.description')}
            </p>

            <div className="mt-4 flex gap-3">
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {syncing ? t('settings.dataSource.syncing') : t('settings.dataSource.syncButton')}
              </Button>

              <Button
                variant="outline"
                onClick={handleLocalImport}
                disabled={syncing}
              >
                {t('settings.dataSource.importLocalButton')}
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {lastSync && entityCount
                ? t('settings.dataSource.lastSynced', {
                    date: formatDate(lastSync),
                    count: Number(entityCount).toLocaleString(),
                  })
                : t('settings.dataSource.noData')}
            </p>
          </section>

          <Separator className="my-6" />

          <section>
            <h2 className="text-xl font-semibold text-foreground">Sample campaign</h2>
            <p className="mt-2 text-base text-muted-foreground">
              Load a small campaign workspace with notes, tables, refs, and a readable graph.
            </p>

            <div className="mt-4">
              <Button onClick={handleSeedSampleCampaign} disabled={syncing || seedingCampaign}>
                {seedingCampaign ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScrollText className="mr-2 h-4 w-4" />
                )}
                Load sample campaign
              </Button>
            </div>
          </section>

          <Separator className="my-6" />

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t('settings.updates.title')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('settings.updates.currentVersion', { version: currentVersion })}
            </p>
            <div className="mt-4">
              {darwin ? (
                <Button variant="outline" onClick={openReleasesPage}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('settings.updates.openReleasePage')}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckForUpdate}
                  disabled={updaterStatus === 'checking'}
                >
                  {updaterStatus === 'checking' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t('settings.updates.check')}
                </Button>
              )}
            </div>
            {darwin ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {t('settings.updates.darwinUnavailable')}
              </p>
            ) : (
              updaterStatus !== 'idle' && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {statusLine(updaterStatus, updaterError)}
                </p>
              )
            )}
          </section>

          <Separator className="my-6" />

          <HotkeysSection />

          <Separator className="my-6" />

          <AboutSection currentVersion={currentVersion} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
    </>
  )
}

function AdvancedSettingsSection() {
  const { t } = useTranslation('common')
  const stagingPool = useAdvancedSettingsStore((s) => s.stagingPool)
  const customContent = useAdvancedSettingsStore((s) => s.customContent)
  const nonMortalCreatures = useAdvancedSettingsStore((s) => s.nonMortalCreatures)
  const autoSyncEnabled = useAdvancedSettingsStore((s) => s.autoSyncEnabled)
  const setStagingPool = useAdvancedSettingsStore((s) => s.setStagingPool)
  const setCustomContent = useAdvancedSettingsStore((s) => s.setCustomContent)
  const setNonMortalCreatures = useAdvancedSettingsStore((s) => s.setNonMortalCreatures)
  const setAutoSyncEnabled = useAdvancedSettingsStore((s) => s.setAutoSyncEnabled)

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">
        {t('settings.advanced.title')}
      </h2>
      <div className="mt-4 divide-y divide-border rounded-md border border-border">
        <AdvancedToggle
          label={t('settings.advanced.stagingPool')}
          description={t('settings.advanced.stagingPoolDescription')}
          checked={stagingPool}
          onCheckedChange={setStagingPool}
        />
        <AdvancedToggle
          label={t('settings.advanced.customContent')}
          description={t('settings.advanced.customContentDescription')}
          checked={customContent}
          onCheckedChange={setCustomContent}
        />
        <AdvancedToggle
          label={t('settings.advanced.nonMortalCreatures')}
          description={t('settings.advanced.nonMortalCreaturesDescription')}
          checked={nonMortalCreatures}
          onCheckedChange={setNonMortalCreatures}
        />
        <AdvancedToggle
          label={t('sync.autoSync')}
          description={t('sync.autoSyncDescription')}
          checked={autoSyncEnabled}
          onCheckedChange={setAutoSyncEnabled}
        />
      </div>
    </section>
  )
}

function AdvancedToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  )
}

function AboutSection({ currentVersion }: { currentVersion: string }) {
  const { t } = useTranslation('common')
  const [section15Open, setSection15Open] = useState(false)
  const [oglOpen, setOglOpen] = useState(false)

  const vendorSha = useMemo(() => {
    const match = vendorVersionTxt.match(/^source_commit:\s*([0-9a-f]{40})/m)
    return match?.[1] ?? 'unknown'
  }, [])

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">
        {t('about.title')}
      </h2>

      <p className="mt-2 text-base text-foreground">
        {t('about.version', { version: currentVersion })}
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        {t('about.paizoDisclaimer')}
      </p>

      <p className="mt-3 text-sm text-muted-foreground">
        {t('about.translationsAttribution')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground font-mono">
        {t('about.vendoredVersion', { sha: vendorSha })}
      </p>

      <Collapsible
        open={section15Open}
        onOpenChange={setSection15Open}
        className="mt-4"
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/80">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${section15Open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <span>
            {t('about.section15Heading')}
            {' — '}
            {t('about.section15Toggle')}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-96 overflow-auto rounded border border-border bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {section15Text}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        open={oglOpen}
        onOpenChange={setOglOpen}
        className="mt-3"
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/80">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${oglOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <span>
            {t('about.oglFullHeading')}
            {' — '}
            {t('about.oglFullToggle')}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-96 overflow-auto rounded border border-border bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {oglFullText}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-4 text-sm">
        <a
          href="https://github.com/kirylyaskou/PathMaid"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {t('about.githubLink')}
        </a>
      </p>
    </section>
  )
}
