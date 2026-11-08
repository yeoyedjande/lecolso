import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { usePendingSync } from '@/features/sync/api'
import { useOnline } from '@/lib/hooks/useOnline'

/**
 * Bandeau affiché tant que l'appareil est hors connexion, ou que des saisies attendent leur envoi
 * (« X éléments en attente »).
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnline()
  const pending = usePendingSync()

  if (online && pending === 0) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-navy px-4 py-2 text-center text-sm font-medium text-white"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      {online ? null : t('states.offline.banner')}
      {pending > 0 && <span>{t('states.offline.pending', { count: pending })}</span>}
    </div>
  )
}
