import { Dices } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useRoll } from '@/shared/hooks'

export function RollDie20Button() {
  const roll = useRoll()

  function handleClick() {
    roll('1d20')
  }

  return (
    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleClick}>
      <Dices className="h-4 w-4" />
      <span className="sr-only">Roll d20</span>
    </Button>
  )
}
