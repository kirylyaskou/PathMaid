import { cn } from '@/shared/lib/utils'

interface MascotWatermarkProps {
  /** Public-relative image path, e.g. '/mascot/arcane_magic_bg.png'. Null/undefined hides the watermark. */
  src: string | null | undefined
  /** When true, shows at full opacity (e.g. on empty state); otherwise as faint background. */
  full?: boolean
  className?: string
}

export function MascotWatermark({ src, full = false, className }: MascotWatermarkProps) {
  if (!src) return null
  return (
    <div
      aria-hidden
      className={cn(
        'absolute right-0 top-0 bottom-0 w-1/2 max-w-175',
        'pointer-events-none select-none z-0',
        'bg-no-repeat bg-bottom-right bg-contain transition-opacity duration-300',
        className,
      )}
      style={{
        backgroundImage: `url('${src}')`,
        opacity: full ? 1 : 0.08,
      }}
    />
  )
}
