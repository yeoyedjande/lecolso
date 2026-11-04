import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'

/** Adresse inconnue dans le back-office : page introuvable, dans la mise en page. */
export const Route = createFileRoute('/$school/_gestion/$')({
  component: GestionNotFound,
})

function GestionNotFound() {
  const { t } = useTranslation()
  return (
    <EmptyState
      headingLevel={1}
      illustration="lost"
      title={t('states.notFound.title')}
      description={t('states.notFound.description')}
    />
  )
}
