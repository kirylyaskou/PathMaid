import { useState, useEffect, useCallback } from 'react'
import { initDatabase } from '@/shared/api'
import { useEncounterBuilderStore } from '@/features/encounter-builder'
import { Button } from '@/shared/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

type SplashStatus = 'init' | 'migrating' | 'ready' | 'error'

interface SplashScreenProps {
  onReady: () => void
}

const STAGE_TEXT: Record<SplashStatus, string> = {
  init: 'Starting...',
  migrating: 'Running migrations...',
  ready: '',
  error: '',
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const [status, setStatus] = useState<SplashStatus>('init')
  const [error, setError] = useState<string | null>(null)
  const [fading, setFading] = useState(false)

  const initialize = useCallback(async () => {
    setStatus('init')
    setError(null)
    try {
      setStatus('migrating')
      await initDatabase()
      await useEncounterBuilderStore.getState().loadConfig()
      setStatus('ready')
      setFading(true)
      setTimeout(onReady, 150)
    } catch (err) {
      console.error('[SplashScreen] Init failed:', err)
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err)
      )
    }
  }, [onReady])

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-150"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <div className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-[28px] font-semibold leading-[1.1] text-pf-gold">
          PathBuddy
        </h1>

        {status === 'error' ? (
          <div
            className="flex flex-col items-center gap-4 rounded-lg bg-card p-8"
            role="alert"
          >
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">
              Failed to initialize database
            </h2>
            <p className="text-base text-muted-foreground">
              {error} — restart the app or contact support.
            </p>
            <Button onClick={initialize}>Retry Initialization</Button>
          </div>
        ) : (
          <div className="flex w-64 flex-col items-center gap-3">
            {(status === 'init' || status === 'migrating') && (
              <Loader2 className="h-6 w-6 animate-spin text-pf-gold" />
            )}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-0 h-full animate-pulse rounded-full bg-primary/60" />
            </div>
            <p
              className="text-sm text-muted-foreground"
              aria-live="polite"
            >
              {STAGE_TEXT[status]}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
