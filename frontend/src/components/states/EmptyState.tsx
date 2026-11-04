import type { ReactNode } from 'react'

import { StateIllustration } from '@/components/brand/Patterns'
import { cn } from '@/lib/utils'

type Illustration = 'empty' | 'search' | 'error' | 'offline' | 'lost' | 'soon'

/** État vide (ou erreur, introuvable, bientôt) : illustration, message, action. */
export function EmptyState({
  title,
  description,
  action,
  illustration = 'empty',
  className,
  role,
  headingLevel = 2,
}: {
  title: ReactNode
  description?: ReactNode | undefined
  action?: ReactNode | undefined
  illustration?: Illustration | undefined
  className?: string | undefined
  role?: 'alert' | 'status' | undefined
  /** 1 quand l'état occupe toute la page (titre principal). */
  headingLevel?: 1 | 2
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <StateIllustration name={illustration} />
      <Heading className="font-display text-lg font-semibold">{title}</Heading>
      {description !== undefined && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  )
}
