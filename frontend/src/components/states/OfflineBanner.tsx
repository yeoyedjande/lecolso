import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useOnline } from '@/lib/hooks/useOnline'

/** Bandeau affiché tant que l'appareil est hors connexion. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnline()

  if (online) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-navy px-4 py-2 text-center text-sm font-medium text-white"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      {t('states.offline.banner')}
    </div>
  )
}
