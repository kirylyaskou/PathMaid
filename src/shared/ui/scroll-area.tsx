import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn('relative overflow-y-auto scrollbar-thin', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function ScrollBar(_props: Record<string, unknown>) {
  return null
}

export { ScrollArea, ScrollBar }
