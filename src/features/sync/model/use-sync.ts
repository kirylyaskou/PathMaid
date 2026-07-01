import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useAuthStore } from '@/features/auth'
import { useAdvancedSettingsStore } from '@/shared/model'
import { isCloudConfigured } from '@/shared/config/env'
import { useSyncStore } from './sync-store'
import { useOnline } from './use-online'

/** Auto-sync cadence when authenticated + online + auto enabled. */
const SYNC_INTERVAL_MS = 60_000

interface UseSyncOptions {
  autoRun?: boolean
}

/**
 * Top-level sync hook — mount once in AppShell / a dedicated provider.
 *
 * Wires together the three sync preconditions:
 *   1. Cloud is configured (env vars present).
 *   2. User is authenticated.
 *   3. Browser reports online.
 *
 * When all three hold AND auto-sync is enabled, schedules a periodic sync.
 * Also triggers an immediate sync on: login transition, connectivity regain.
 *
 * Returns the reactive sync status for indicators to consume.
 */
export function useSync({ autoRun = false }: UseSyncOptions = {}) {
  const online = useOnline()

  const authStatus = useAuthStore((s) => s.status)
  const authenticated = authStatus === 'authenticated'

  const autoSyncEnabled = useAdvancedSettingsStore((s) => s.autoSyncEnabled)
  const setAutoSyncEnabled = useAdvancedSettingsStore((s) => s.setAutoSyncEnabled)

  const syncNow = useSyncStore((s) => s.syncNow)
  const syncState = useSyncStore(
    useShallow((s) => ({
      status: s.status,
      lastSyncAt: s.lastSyncAt,
      lastError: s.lastError,
      lastResult: s.lastResult,
    })),
  )

  const shouldRun =
    autoRun && isCloudConfigured && authenticated && online && autoSyncEnabled

  // Keep a ref to syncNow so the interval doesn't capture a stale closure.
  const syncNowRef = useRef(syncNow)
  syncNowRef.current = syncNow
  const runningRef = useRef(false)

  // Periodic sync.
  useEffect(() => {
    if (!shouldRun) return
    const id = window.setInterval(() => {
      // Guard against overlapping runs — a slow sync shouldn't queue up.
      if (runningRef.current) return
      runningRef.current = true
      void syncNowRef.current().finally(() => {
        runningRef.current = false
      })
    }, SYNC_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [shouldRun])

  // Sync immediately when (re)gaining all preconditions — e.g. after login or
  // reconnecting. Skips if a sync is already running.
  const prevShouldRun = useRef(false)
  useEffect(() => {
    if (shouldRun && !prevShouldRun.current && !runningRef.current) {
      runningRef.current = true
      void syncNowRef.current().finally(() => {
        runningRef.current = false
      })
    }
    prevShouldRun.current = shouldRun
  }, [shouldRun])

  return {
    ...syncState,
    online,
    autoSyncEnabled,
    setAutoSyncEnabled,
    cloudConfigured: isCloudConfigured,
    authenticated,
    canSync: isCloudConfigured && authenticated && online,
    syncNow,
  }
}
