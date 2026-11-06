import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useOutboxSync } from './api'

/** Envoie en arrière-plan les saisies faites hors connexion (appel, garderie) de l'école courante. */
export function OutboxSync() {
  const { t } = useTranslation()
  const messages = useMemo(
    () => ({
      synced: (count: number) => t('sync.done', { count }),
      rejected: (message: string) => t('sync.rejected', { message }),
    }),
    [t],
  )
  useOutboxSync(messages)
  return null
}
