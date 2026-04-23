import { History, Moon, Sun, Dices } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { RollDie20Button } from '@/shared/ui/roll-die20-button'
import { DicePanel } from '@/shared/ui/DicePanel'
import { RollHistoryPanel } from '@/widgets/roll-history'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div />
      <div className="flex items-center gap-2">
        <RollDie20Button />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Dices className="h-4 w-4" />
              <span className="sr-only">{t('header.diceRoller')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0">
            <DicePanel />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <History className="h-4 w-4" />
              <span className="sr-only">{t('header.rollHistory')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0 w-[420px]">
            <RollHistoryPanel />
          </PopoverContent>
        </Popover>
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('header.toggleTheme')}</span>
        </Button>
      </div>
    </header>
  )
}
