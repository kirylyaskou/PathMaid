import { cn } from '@/shared/lib/utils'

interface MascotHexProps {
  size: number
  className?: string
}

const OUTER_CLIP =
  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
const INNER_CLIP =
  'polygon(50% 3%, 97% 26.5%, 97% 73.5%, 50% 97%, 3% 73.5%, 3% 26.5%)'

export function MascotHex({ size, className }: MascotHexProps) {
  const gifIndex = Math.floor(Math.random() * 7) + 1
  const height = size * 1.1547

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
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
  )
}
