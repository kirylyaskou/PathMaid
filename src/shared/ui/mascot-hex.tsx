import { useState, useEffect } from 'react'
import { cn } from '@/shared/lib/utils'

interface MascotHexProps {
  size: number
  className?: string
}

const GIF_COUNT = 9

function randomGif(exclude?: number): number {
  let next = Math.floor(Math.random() * (GIF_COUNT - 1)) + 1
  if (exclude !== undefined && next >= exclude) next++
  return next
}

export function MascotHex({ size, className }: MascotHexProps) {
  const [gifIndex, setGifIndex] = useState(() => randomGif())

  useEffect(() => {
    const id = setInterval(() => {
      setGifIndex(prev => randomGif(prev))
    }, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={cn('animate-mascot-sway', className)}
      style={{ width: size, height: size, position: 'relative' }}
    >
      {/* Soft black blob — seamless integration into dark background */}
      <div
        style={{
          position: 'absolute',
          inset: '-28%',
          background: 'black',
          borderRadius: '42% 58% 55% 45% / 52% 44% 56% 48%',
          filter: 'blur(28px)',
        }}
      />
      <img
        src={`/mascot/maid_${gifIndex}.gif`}
        alt="PathMaid mascot"
        style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
