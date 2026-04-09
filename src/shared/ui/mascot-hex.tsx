import { useState, useEffect } from 'react'
import { cn } from '@/shared/lib/utils'

interface MascotHexProps {
  height: number
  className?: string
}

const GIF_COUNT = 9

function randomGif(exclude?: number): number {
  let next = Math.floor(Math.random() * (GIF_COUNT - 1)) + 1
  if (exclude !== undefined && next >= exclude) next++
  return next
}

export function MascotHex({ height, className }: MascotHexProps) {
  const [gifIndex, setGifIndex] = useState(() => randomGif())

  useEffect(() => {
    const id = setInterval(() => setGifIndex(prev => randomGif(prev)), 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <img
      src={`/mascot/maid_${gifIndex}.gif`}
      alt="PathMaid mascot"
      className={cn(className)}
      style={{ height, width: 'auto', objectFit: 'contain' }}
    />
  )
}
