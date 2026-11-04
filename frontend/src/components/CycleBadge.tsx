import { CYCLE_CLASSES, cycleTone } from '@/lib/cycles'
import { cn } from '@/lib/utils'

/** Pastille d'un cycle à sa couleur (code du catalogue → teinte, libellé fourni par l'API ou i18n). */
export function CycleBadge({
  code,
  label,
  className,
}: {
  code: string | null | undefined
  label: string
  className?: string
}) {
  const tone = CYCLE_CLASSES[cycleTone(code)]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tone.soft,
        className,
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', tone.dot)} />
      {label}
    </span>
  )
}
