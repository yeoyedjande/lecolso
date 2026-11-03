import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { EmptyState } from './EmptyState'

/** Erreur de chargement, avec nouvel essai. */
export function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const { t } = useTranslation()

  return (
    <EmptyState
      role="alert"
      illustration="error"
      title={t('states.error.title')}
      description={t('states.error.description')}
      className={className}
      action={
        onRetry !== undefined && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw aria-hidden />
            {t('common.retry')}
          </Button>
        )
      }
    />
  )
}
