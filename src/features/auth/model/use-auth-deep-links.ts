import { useEffect } from 'react'
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { toast } from 'sonner'

import { i18n } from '@/shared/i18n'
import { isCloudConfigured } from '@/shared/config/env'
import { getAuthErrorToast } from '../lib/auth-error-toast'
import { useAuthStore } from './auth-store'

interface TauriWindow extends Window {
  __TAURI_INTERNALS__?: unknown
}

function isTauriRuntime(): boolean {
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__)
}

const pendingAuthDeepLinks = new Set<string>()
const handledAuthDeepLinks = new Set<string>()

export function useAuthDeepLinks(): void {
  const completeAuthCallback = useAuthStore((s) => s.completeAuthCallback)

  useEffect(() => {
    if (!isCloudConfigured || !isTauriRuntime()) return

    let cancelled = false
    let unlisten: (() => void) | null = null

    const processUrls = async (urls: string[] | null) => {
      if (!urls || cancelled) return

      for (const url of urls) {
        if (pendingAuthDeepLinks.has(url) || handledAuthDeepLinks.has(url)) continue
        pendingAuthDeepLinks.add(url)

        try {
          const handled = await completeAuthCallback(url)
          if (handled) {
            handledAuthDeepLinks.add(url)
            if (!cancelled) {
              toast.success(i18n.t('auth.signedIn'))
            }
          }
        } catch (err) {
          if (useAuthStore.getState().session) {
            handledAuthDeepLinks.add(url)
            continue
          }

          if (!cancelled) {
            const authErrorToast = getAuthErrorToast(err, i18n.t)
            toast.error(authErrorToast.title, {
              description: authErrorToast.description,
            })
          }
        } finally {
          pendingAuthDeepLinks.delete(url)
        }
      }
    }

    void getCurrent()
      .then(processUrls)
      .catch((err) => {
        console.warn('[auth] could not read startup deep link:', err)
      })

    void onOpenUrl((urls) => {
      void processUrls(urls)
    })
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten()
        } else {
          unlisten = nextUnlisten
        }
      })
      .catch((err) => {
        console.warn('[auth] could not subscribe to deep links:', err)
      })

    return () => {
      cancelled = true
      if (unlisten) unlisten()
    }
  }, [completeAuthCallback])
}
