import { cn } from '@/shared/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual intent: default = neutral, danger = red on hover, primary = accent on hover */
  intent?: 'default' | 'danger' | 'primary'
  /** Size: sm = w-5 h-5 (slot buttons), md = w-7 h-7 (toolbar) */
  size?: 'sm' | 'md'
  /** Only visible on parent group hover */
  showOnHover?: boolean
}

export function IconButton({
  intent = 'default',
  size = 'sm',
  showOnHover,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center rounded border transition-colors',
        size === 'sm' && 'w-5 h-5',
        size === 'md' && 'w-7 h-7',
        intent === 'default' && 'border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30',
        intent === 'danger' && 'border-border/60 bg-secondary/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-30',
        intent === 'primary' && 'border-border/60 bg-secondary/60 text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-30',
        showOnHover && 'opacity-0 group-hover:opacity-100 transition-opacity',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
