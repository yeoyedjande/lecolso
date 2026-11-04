import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'

import { can } from './access'
import { useCurrentSchool } from './useCurrentSchool'

/** Écran réservé à une permission (lien direct sans le droit) : message clair plutôt qu'un écran cassé. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | readonly string[]
  children: ReactNode
}) {
  const { t } = useTranslation()
  const school = useCurrentSchool()

  if (!can(school, permission)) {
    return (
      <EmptyState
        headingLevel={1}
        illustration="lost"
        title={t('states.forbidden.title')}
        description={t('states.forbidden.description')}
      />
    )
  }
  return <>{children}</>
}

/** Affiche le contenu seulement si la permission est détenue (actions, boutons). */
export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const school = useCurrentSchool()
  return can(school, permission) ? <>{children}</> : null
}
