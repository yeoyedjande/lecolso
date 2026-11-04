import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'

/** Adresse inconnue dans l'espace : page introuvable, dans la mise en page. */
export const Route = createFileRoute('/$school/enseignant/$')({
  component: SpaceNotFound,
})

function SpaceNotFound() {
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
