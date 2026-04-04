import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useRollStore } from '@/shared/model/roll-store'
import { RollResultToast } from './roll-result-toast'

export function RollToastListener() {
  const rolls = useRollStore((state) => state.rolls)
  const prevLengthRef = useRef(rolls.length)

  useEffect(() => {
    if (rolls.length > prevLengthRef.current) {
      const newestRoll = rolls[rolls.length - 1]
      toast.custom(() => <RollResultToast roll={newestRoll} />, {
        duration: 4000,
        position: 'bottom-right',
      })
    }
    prevLengthRef.current = rolls.length
  }, [rolls.length])

  return null
}
