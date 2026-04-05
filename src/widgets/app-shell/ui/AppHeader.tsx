import { History, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { RollDie20Button } from '@/shared/ui/roll-die20-button'
import { RollHistoryPanel } from '@/widgets/roll-history'

export function AppHeader() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div />
      <div className="flex items-center gap-2">
        <RollDie20Button />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <History className="h-4 w-4" />
              <span className="sr-only">Roll History</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0 w-[420px]">
            <RollHistoryPanel />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
