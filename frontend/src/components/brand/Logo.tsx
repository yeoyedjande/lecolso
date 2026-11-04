import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

/**
 * Marque : un toit d'école (bleu nuit) qui abrite un soleil levant (orange) et trois briques aux couleurs
 * des cycles. Dessin original.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} aria-hidden focusable="false">
      <rect width="48" height="48" rx="14" fill="#1B2559" />
      <path
        d="M10 22 24 11l14 11"
        fill="none"
        stroke="#FBF8F3"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 29a7 7 0 0 1 14 0" fill="#F28C28" />
      <rect x="13" y="31" width="7" height="6" rx="2" fill="#F97362" />
      <rect x="20.5" y="31" width="7" height="6" rx="2" fill="#F5B700" />
      <rect x="28" y="31" width="7" height="6" rx="2" fill="#3B82F6" />
    </svg>
  )
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const { t } = useTranslation()

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span
        className={cn(
          'font-display text-lg font-bold tracking-tight',
          inverted ? 'text-white' : 'text-foreground',
        )}
      >
        {t('brand.name')}
      </span>
    </span>
  )
}
