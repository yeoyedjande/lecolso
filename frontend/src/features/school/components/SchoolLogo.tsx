import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

/** Logo d'une école (URL signée renvoyée par l'API), sur fond blanc pour rester lisible en mode sombre. */
export function SchoolLogo({
  url,
  name,
  className,
}: {
  url: string
  name: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <img
      src={url}
      alt={t('school.logoAlt', { name })}
      className={cn('shrink-0 rounded-xl bg-white object-contain p-0.5', className)}
      decoding="async"
    />
  )
}
