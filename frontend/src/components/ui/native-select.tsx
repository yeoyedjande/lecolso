import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/** Liste déroulante native (accessible, adaptée au mobile), au style des champs. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select
        data-slot="native-select"
        className={cn(
          'h-11 w-full min-w-0 appearance-none rounded-xl border border-input bg-surface pr-10 pl-4 text-base text-foreground shadow-xs outline-none md:text-sm',
          'focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20',
          'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export { NativeSelect }
