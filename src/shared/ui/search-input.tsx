import { forwardRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Show a spinner instead of the search icon */
  loading?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, loading, ...props }, ref) => {
    const Icon = loading ? Loader2 : Search
    return (
      <div className="relative">
        <Icon className={cn(
          'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground',
          loading && 'animate-spin',
        )} />
        <Input ref={ref} className={cn('pl-8', className)} {...props} />
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'
