import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useAuthStore } from '@/features/auth/model'

export type LoginDialogMode = 'signin' | 'signup'

export interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: LoginDialogMode
}

/**
 * Email/password auth dialog. Mirrors UpdateDialog's controlled pattern:
 * the open state is owned by the parent (AccountMenu) so it can be opened from
 * the header button and closed on success.
 *
 * Two modes share one form — toggle via the secondary button in the footer.
 * On signUp without a confirmed email, Supabase returns no session; we surface
 * a "check your inbox" toast and switch to sign-in mode rather than treating
 * it as an error.
 */
export function LoginDialog({ open, onOpenChange, initialMode = 'signin' }: LoginDialogProps) {
  const { t } = useTranslation()
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const loading = useAuthStore((s) => s.status === 'loading')

  const [mode, setMode] = useState<LoginDialogMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Sync mode when the dialog is re-opened in a different mode.
  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  const reset = () => {
    setEmail('')
    setPassword('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return // block close during request
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) return

    try {
      if (mode === 'signup') {
        await signUp(trimmedEmail, password)
        const session = useAuthStore.getState().session
        if (!session) {
          // Email confirmation required — Supabase default policy.
          toast.success(t('auth.signUp.confirmEmail'))
          setMode('signin')
          reset()
          return
        }
      } else {
        await signIn(trimmedEmail, password)
      }
      const ok = useAuthStore.getState().status === 'authenticated'
      if (ok) {
        toast.success(t('auth.signedIn'))
        onOpenChange(false)
        reset()
      }
    } catch (err) {
      // The store already recorded a typed error; translate it for the toast.
      const code = (err as { code?: string })?.code ?? 'unknown'
      toast.error(t(`auth.errors.${code}`, { defaultValue: t('auth.errors.unknown') }))
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => { if (loading) e.preventDefault() }}
        onEscapeKeyDown={(e) => { if (loading) e.preventDefault() }}
        showCloseButton={!loading}
        className="max-w-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === 'signin' ? t('auth.signIn.title') : t('auth.signUp.title')}
            </DialogTitle>
            <DialogDescription>
              {mode === 'signin'
                ? t('auth.signIn.description')
                : t('auth.signUp.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">{t('auth.email')}</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-password">{t('auth.password')}</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={loading || !email.trim() || !password}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? t('auth.signIn.submit') : t('auth.signUp.submit')}
            </Button>
            <Button
              type="button"
              variant="link"
              className="text-xs text-muted-foreground"
              onClick={switchMode}
              disabled={loading}
            >
              {mode === 'signin' ? t('auth.signIn.switchToSignUp') : t('auth.signUp.switchToSignIn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
