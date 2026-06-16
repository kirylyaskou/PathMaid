import { useState } from 'react'
import { Cloud, CloudOff, LogOut, UploadCloud, DownloadCloud, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/model'
import { runPushOnly, runPullOnly } from '@/features/sync'
import { resetAllProgress } from '@/shared/api'
import { LoginDialog } from './LoginDialog'

/**
 * Header account entry point.
 *
 * When unauthenticated: a ghost CloudOff button that opens LoginDialog.
 * When authenticated: a dropdown showing the user's email with a sign-out
 * action. Mirrors LanguageSwitcher's DropdownMenu shape.
 */
export function AccountMenu() {
  const { t } = useTranslation()
  const [loginOpen, setLoginOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const authenticated = status === 'authenticated' && user != null

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success(t('auth.signedOut'))
    } catch {
      toast.error(t('auth.errors.unknown'))
    }
  }

  // First-login / manual override flows. "Push all" seeds the server with all
  // local data (marks every synced row dirty + runs push). "Pull all" replaces
  // local with remote (used when switching to a new device). Both are explicit
  // user actions — no silent bulk transfer.
  const handlePushAll = async () => {
    setBusy(true)
    try {
      const result = await runPushOnly()
      toast.success(
        t('sync.syncedSummary', {
          pulled: 0,
          pushed: result.pushed + result.deleted + result.assetsUploaded,
        }),
      )
    } catch {
      toast.error(t('sync.errors.unknown'))
    } finally {
      setBusy(false)
    }
  }

  const handlePullAll = async () => {
    setBusy(true)
    try {
      // Reset watermarks so the pull fetches the FULL remote state, not just
      // rows newer than the last incremental sync. This is what makes it a
      // "download everything" action for first-login on a new device.
      await resetAllProgress()
      const result = await runPullOnly()
      toast.success(
        t('sync.syncedSummary', {
          pulled: result.applied + result.assetsDownloaded,
          pushed: 0,
        }),
      )
    } catch {
      toast.error(t('sync.errors.unknown'))
    } finally {
      setBusy(false)
    }
  }

  if (!authenticated) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          aria-label={t('auth.signIn.title')}
          onClick={() => setLoginOpen(true)}
        >
          <CloudOff className="h-4 w-4" />
          <span className="sr-only">{t('auth.signIn.title')}</span>
        </Button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          aria-label={t('auth.account')}
        >
          <Cloud className="h-4 w-4" />
          <span className="sr-only">{t('auth.account')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground">
            {user!.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handlePushAll()} disabled={busy}>
          <UploadCloud className="h-4 w-4" />
          {t('sync.pushAll')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handlePullAll()} disabled={busy}>
          <DownloadCloud className="h-4 w-4" />
          {t('sync.pullAll')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <LogOut className="h-4 w-4" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
