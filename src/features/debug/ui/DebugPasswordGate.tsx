import { useState, useCallback, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Lock, Loader2 } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { verifyDebugPassword } from '../model/debug-auth'

interface DebugPasswordGateProps {
  /** Called once the correct password is supplied. */
  onUnlock: () => void
}

export function DebugPasswordGate({ onUnlock }: DebugPasswordGateProps) {
  const { t } = useTranslation('common')
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!value.trim()) return
      setChecking(true)
      // Tiny artificial delay so the spinner is visible on instant checks —
      // avoids a jarring flash and signals "something was verified".
      await new Promise((r) => setTimeout(r, 200))
      if (verifyDebugPassword(value.trim())) {
        onUnlock()
      } else {
        toast.error(t('debug.wrongPassword'))
      }
      setChecking(false)
      setValue('')
    },
    [value, onUnlock, t],
  )

  return (
    <Empty className="m-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Lock />
        </EmptyMedia>
        <EmptyTitle>{t('debug.gateTitle')}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <form className="flex w-full max-w-xs items-center gap-2" onSubmit={handleSubmit}>
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('debug.passwordPlaceholder')}
            autoComplete="off"
            autoFocus
            disabled={checking}
          />
          <Button type="submit" size="icon" disabled={checking || !value.trim()}>
            {checking ? <Loader2 className="animate-spin" /> : <Lock />}
          </Button>
        </form>
      </EmptyContent>
    </Empty>
  )
}
