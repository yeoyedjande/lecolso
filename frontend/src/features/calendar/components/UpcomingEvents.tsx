import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { schoolToday } from '@/features/attendance/status'
import { formatDay, formatDayMonth } from '@/lib/format'

import { useEvents } from '../api'

function inDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

/** Prochains événements du calendrier (60 jours) pour les accueils mobiles ; rien s'il n'y en a pas. */
export function UpcomingEvents({ limit = 3 }: { limit?: number }) {
  const { t } = useTranslation()
  const today = schoolToday()
  const events = (useEvents(today, inDays(today, 60)).data ?? []).slice(0, limit)
  if (events.length === 0) return null

  return (
    <section aria-labelledby="upcoming-title" className="grid gap-3">
      <h2 id="upcoming-title" className="font-display text-lg font-semibold">
        {t('calendar.upcomingShort')}
      </h2>
      <ul className="grid grid-cols-1 gap-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-center font-display text-xs font-bold text-accent-ink">
              {formatDayMonth(event.starts_on)}
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-semibold">{event.title}</span>
              <span className="text-xs text-muted-foreground">
                {t(`calendar.kinds.${event.kind}`)}
                {event.ends_on !== event.starts_on &&
                  ` · ${formatDay(event.starts_on)} → ${formatDay(event.ends_on)}`}
                {event.location !== null && ` · ${event.location}`}
              </span>
            </span>
            <CalendarDays aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </section>
  )
}
