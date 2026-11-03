import * as React from 'react'

import { cn } from '@/lib/utils'

/** Bloc de chargement (squelette) : décoratif, caché aux lecteurs d'écran. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn('animate-pulse rounded-xl bg-warm-200/70 dark:bg-white/10', className)}
      {...props}
    />
  )
}

export { Skeleton }
