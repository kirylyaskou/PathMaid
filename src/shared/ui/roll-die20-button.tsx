import { Dices } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { rollDice } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'

export function RollDie20Button() {
  const addRoll = useRollStore((state) => state.addRoll)

  function handleClick() {
    const roll = rollDice('1d20')
    addRoll(roll)
  }

  return (
    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleClick}>
      <Dices className="h-4 w-4" />
      <span className="sr-only">Roll d20</span>
    </Button>
  )
}
