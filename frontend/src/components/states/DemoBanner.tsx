import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

/** Bandeau discret sur les écrans alimentés par les données de démonstration (VITE_DEMO_MODULES). */
export function DemoBanner({ className }: { className?: string }) {
  const { t } = useTranslation()

  if (!env.demoModules) return null

  return (
    <p
      className={cn(
        'inline-flex w-fit items-center gap-2 rounded-full border border-dashed border-accent/60 bg-orange-100/60 px-3 py-1 text-xs font-medium text-accent-ink dark:bg-orange/10',
        className,
      )}
    >
      <FlaskConical aria-hidden className="size-3.5" />
      {t('states.demo')}
    </p>
  )
}
