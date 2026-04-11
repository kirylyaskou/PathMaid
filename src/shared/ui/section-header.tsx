import { CollapsibleTrigger } from '@/shared/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  children: ReactNode
  /** Extra elements rendered to the right of the label, before the chevron */
  trailing?: ReactNode
}

export function SectionHeader({ children, trailing }: SectionHeaderProps) {
  return (
    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
        {children}
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  )
}
