import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from '@/shared/ui/sonner'
import { UpdateDialog } from '@/widgets/update-dialog'
import { i18n } from '@/shared/i18n'
import { useStartupUpdateCheck } from './useStartupUpdateCheck'

export function AppProviders({ children }: { children: React.ReactNode }) {
  useStartupUpdateCheck()
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
