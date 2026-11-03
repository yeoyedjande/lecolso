import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { Button } from '@/components/ui/button'
import type { Space } from '@/features/auth/access'

import { SpaceLink } from './SpaceLink'

/** Écran pas encore livré (route attrape-tout de chaque espace). */
export function ComingSoon({ space }: { space: Space }) {
  const { t } = useTranslation()

  return (
    <EmptyState
      illustration="soon"
      headingLevel={1}
      title={t('states.soon.title')}
      description={t('states.soon.description')}
      className="mt-4"
      action={
        <Button asChild variant="outline">
          <SpaceLink space={space} path="">
            {t('states.soon.action')}
          </SpaceLink>
        </Button>
      }
    />
  )
}
