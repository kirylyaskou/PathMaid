import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from '@/shared/ui/sonner'
import { UpdateDialog } from '@/widgets/update-dialog'
import { i18n } from '@/shared/i18n'
import { useAuthDeepLinks, useAuthStore } from '@/features/auth'
import { useStartupUpdateCheck } from './useStartupUpdateCheck'

export function AppProviders({ children }: { children: React.ReactNode }) {
  useStartupUpdateCheck()
  useAuthDeepLinks()

  // Hydrate the cloud auth session once on boot. Safe no-op when cloud is not
  // configured (hydrate() checks isCloudConfigured internally). Restores a
  // logged-in user across app restarts via the supabase-js localStorage token.
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
        {children}
        <Toaster />
        <UpdateDialog />
      </ThemeProvider>
    </I18nextProvider>
  )
}
