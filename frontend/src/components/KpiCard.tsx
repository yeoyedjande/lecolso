import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { AnimatedNumber } from './motion/AnimatedNumber'

/** Indicateur clé : libellé, valeur animée (chiffres en Bricolage Grotesque), tendance ou précision. */
export function KpiCard({
  label,
  value,
  format,
  icon: Icon,
  hint,
  tone = 'navy',
  className,
}: {
  label: string
  value: number
  format: (value: number) => string
  icon: LucideIcon
  hint?: ReactNode
  tone?: 'navy' | 'accent' | 'success' | 'danger'
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          aria-hidden
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            tone === 'navy' && 'bg-navy-100 text-navy dark:bg-white/10 dark:text-foreground',
            tone === 'accent' && 'bg-orange-100 text-accent-ink dark:bg-orange/20',
            tone === 'success' && 'bg-success-soft text-success-ink',
            tone === 'danger' && 'bg-destructive-soft text-destructive-ink',
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p
        className={cn(
          'mt-3 font-display font-bold tracking-tight whitespace-nowrap',
          // Montants longs (FCFA) : taille réduite pour tenir dans la carte
          format(value).length > 11 ? 'text-2xl' : 'text-3xl',
        )}
      >
        <AnimatedNumber value={value} format={format} />
      </p>
      {hint !== undefined && <div className="mt-1.5 text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
