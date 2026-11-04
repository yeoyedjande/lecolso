import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Montant en FCFA (entier) : « 150 000 FCFA ». */
export function MoneyAmount({ value, className }: { value: number; className?: string }) {
  return <span className={cn('tabular whitespace-nowrap', className)}>{formatMoney(value)}</span>
}
