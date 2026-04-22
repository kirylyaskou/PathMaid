import { useShallow } from 'zustand/react/shallow'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { useUpdaterStore } from '@/shared/model'
import {
  downloadAndInstallUpdate,
  isDarwin,
  openReleasesPage,
} from '@/shared/api'

/**
 * Global update dialog — mounted once in AppProviders.
 *
 * Driven entirely by useUpdaterStore.status. Opens when status is one of
 * 'available' | 'downloading' | 'installing' | 'error'. Closed (returns null)
 * on macOS — darwin is a read-only updater platform.
 *
 * Progress events from downloadAndInstallUpdate flow back into the store via
 * setDownloading — useShallow ensures the component re-renders only when
 * the four selected fields change (not on unrelated store writes).
 */
export function UpdateDialog() {
  // darwin guard — return null BEFORE any hook calls (hook order stability).
  // isDarwin() is sync (platform() reads from window.__TAURI_OS_PLUGIN_INTERNALS__
  // synchronously) — safe in render.
  if (isDarwin()) return null

  const { status, update, progress, error } = useUpdaterStore(
    useShallow((s) => ({
      status: s.status,
      update: s.update,
      progress: s.progress,
      error: s.error,
    })),
  )

  const isOpen =
    status === 'available' ||
    status === 'downloading' ||
    status === 'installing' ||
    status === 'error'

  const isBusy = status === 'downloading' || status === 'installing'

  // Linux cross-device error detection — case-insensitive substring match.
  // classifyUpdateError preserves raw Tauri message, which on Linux
  // is literally "Invalid cross-device link (os error 18)".
  const isCrossDeviceError =
    status === 'error' &&
    error != null &&
    (error.toLowerCase().includes('os error 18') ||
      error.toLowerCase().includes('cross-device'))

  const handleOpenChange = (open: boolean) => {
    // Prevent close during download/install — Pitfall 8 in research.
    if (!open && !isBusy) {
      useUpdaterStore.getState().reset()
    }
  }

  const handleDismiss = () => {
    useUpdaterStore.getState().reset()
  }

  const handleDownload = async () => {
    const store = useUpdaterStore.getState()
    store.setDownloading({ received: 0, total: null })
    try {
      await downloadAndInstallUpdate((p) => {
        useUpdaterStore.getState().setDownloading(p)
      })
      // downloadAndInstallUpdate resolves once install() fires; relaunch
      // happens via plugin-process. Flip status so UI shows "Перезапуск..."
      // until the process actually dies.
      useUpdaterStore.getState().setInstalling()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      useUpdaterStore.getState().setError(message)
    }
  }

  const progressPercent =
    progress && progress.total != null && progress.total > 0
      ? Math.round((progress.received / progress.total) * 100)
      : undefined

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault()
        }}
        showCloseButton={!isBusy}
        className="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>
            {status === 'available' &&
              `Доступно обновление v${update?.version ?? ''}`}
            {status === 'downloading' && 'Скачиваем обновление'}
            {status === 'installing' && 'Устанавливаем обновление'}
            {status === 'error' && 'Ошибка обновления'}
          </DialogTitle>
          {status === 'available' && update && (
            <DialogDescription>
              Текущая версия: {update.currentVersion} → новая: {update.version}
            </DialogDescription>
          )}
        </DialogHeader>

        {status === 'available' && update?.body && (
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground max-h-64 overflow-y-auto">
            {update.body}
          </pre>
        )}

        {status === 'downloading' && (
          <div className="space-y-2">
            <Progress
              value={progressPercent}
              className="h-2"
              aria-label="Прогресс скачивания обновления"
            />
            <p className="text-sm text-muted-foreground">
              {progressPercent != null
                ? `Скачано ${progressPercent}%`
                : 'Начинаем скачивание...'}
            </p>
          </div>
        )}

        {status === 'installing' && (
          <p className="text-sm text-muted-foreground">Перезапуск...</p>
        )}

        {status === 'error' && isCrossDeviceError && (
          <div className="space-y-3">
            <p className="text-sm">
              Installer попытался переместить файл между разделами. Скачайте
              установщик вручную со страницы релиза и запустите самостоятельно.
            </p>
            <Button variant="outline" onClick={openReleasesPage}>
              Открыть страницу релиза
            </Button>
          </div>
        )}

        {status === 'error' && !isCrossDeviceError && error && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Ошибка: {error}</p>
            <p className="text-sm text-muted-foreground">
              Если обновление не применилось, перезапустите приложение вручную — база данных была временно закрыта для установки.
            </p>
          </div>
        )}

        <DialogFooter>
          {status === 'available' && (
            <>
              <Button variant="outline" onClick={handleDismiss}>
                Позже
              </Button>
              <Button onClick={handleDownload}>Скачать и установить</Button>
            </>
          )}
          {status === 'error' && (
            <Button variant="outline" onClick={handleDismiss}>
              Закрыть
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
