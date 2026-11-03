import * as React from 'react'

import { cn } from '@/lib/utils'

import { Label } from './label'

/**
 * Champ de formulaire : libellé, contrôle, aide et message d'erreur reliés par aria-describedby.
 * Le contrôle reçoit id, aria-invalid et aria-describedby via render prop.
 */
function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string | undefined
  className?: string
  children: (control: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => React.ReactNode
}) {
  const id = React.useId()
  const hintId = hint === undefined ? undefined : `${id}-hint`
  const errorId = error === undefined ? undefined : `${id}-error`
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div data-slot="field" className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': error !== undefined, 'aria-describedby': describedBy })}
      {hint !== undefined && (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-destructive-ink">
          {error}
        </p>
      )}
    </div>
  )
}

export { Field }
