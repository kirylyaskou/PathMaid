import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { CreatureStatBlock } from './CreatureStatBlock'
import { fetchCreatureStatBlockData } from '../model/fetchStatBlock'
import type { CreatureStatBlockData } from '../model/types'

interface StatBlockModalProps {
  creatureId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StatBlockModal({ creatureId, open, onOpenChange }: StatBlockModalProps) {
  const [data, setData] = useState<CreatureStatBlockData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !creatureId) { setData(null); return }
    setLoading(true)
    fetchCreatureStatBlockData(creatureId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, creatureId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto p-0">
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        )}
        {!loading && data && <CreatureStatBlock creature={data} />}
        {!loading && !data && open && (
          <div className="p-8 text-center text-sm text-muted-foreground">No stat block available.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
