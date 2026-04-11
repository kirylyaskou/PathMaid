import type { ReactNode } from 'react'

interface StatRowProps {
  label: string
  children: ReactNode
}

export function StatRow({ label, children }: StatRowProps) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-semibold text-muted-foreground w-24 shrink-0">{label}</span>
      <span>{children}</span>
    </div>
  )
}
