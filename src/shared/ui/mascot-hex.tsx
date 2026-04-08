import { useState, useEffect } from 'react'
import { cn } from '@/shared/lib/utils'

interface MascotHexProps {
  size: number
  className?: string
}

const OUTER_CLIP =
  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
const INNER_CLIP =
  'polygon(50% 3.75%, 96.25% 26.9%, 96.25% 73.1%, 50% 96.25%, 3.75% 73.1%, 3.75% 26.9%)'

const GIF_COUNT = 9

function randomGif(exclude?: number): number {
  let next = Math.floor(Math.random() * (GIF_COUNT - 1)) + 1
  if (exclude !== undefined && next >= exclude) next++
  return next
}

export function MascotHex({ size, className }: MascotHexProps) {
  const [gifIndex, setGifIndex] = useState(() => randomGif())
  const height = size * 1.1547

  useEffect(() => {
    const id = setInterval(() => {
      setGifIndex(prev => randomGif(prev))
    }, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={cn('animate-mascot-sway', className)}
      style={{
        width: size,
        height,
        background: 'black',
        clipPath: OUTER_CLIP,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: INNER_CLIP,
          overflow: 'hidden',
        }}
      >
        <img
          src={`/mascot/maid_${gifIndex}.gif`}
          alt="PathMaid mascot"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}
