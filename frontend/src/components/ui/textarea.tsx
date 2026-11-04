import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-xl border border-input bg-surface px-4 py-3 text-base text-foreground shadow-xs outline-none placeholder:text-muted-foreground md:text-sm',
        'focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
