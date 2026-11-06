import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { useUnreadCount } from '../api'

/** Pastille du menu « Messages » : nombre de fils non lus (rien s'il n'y en a pas). */
export function UnreadBadge({ className }: { className?: string }) {
  const { t } = useTranslation()
  const count = useUnreadCount().data ?? 0
  if (count === 0) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[11px] leading-5 font-bold text-navy',
        className,
      )}
    >
      <span aria-hidden>{count > 9 ? '9+' : count}</span>
      <span className="sr-only">{t('messaging.unreadThreads', { count })}</span>
    </span>
  )
}
