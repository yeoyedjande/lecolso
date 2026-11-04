import { Link } from '@tanstack/react-router'
import { CalendarX2, ChevronRight, Megaphone, MessageCircle, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { Reveal } from '@/components/motion/Reveal'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useMe } from '@/features/auth/api'
import { useAnnouncements } from '@/features/messaging/api'
import { CYCLE_CLASSES } from '@/lib/cycles'
import { formatAverage, formatDateTime, formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useMyChildren } from '../api'
import { relevantAnnouncements } from '../demo'

/** Accueil parent : une carte par enfant, raccourcis vers les actions fréquentes, annonces. */
export function ParentHome() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const children = useMyChildren()
  const announcements = useAnnouncements()
  const firstName = profile?.name.split(' ')[0] ?? ''

  const quick = [
    { to: '/$school/parent/paiements', icon: Wallet, label: t('parent.home.pay') },
    { to: '/$school/parent/justifier', icon: CalendarX2, label: t('parent.home.justify') },
    { to: '/$school/parent/messages', icon: MessageCircle, label: t('parent.home.messages') },
  ] as const

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">
          {t('parent.home.greeting', { name: firstName })}
        </h1>
        <p className="text-muted-foreground">{t('parent.home.subtitle')}</p>
      </div>

      <section aria-labelledby="children-title" className="grid gap-3">
        <h2 id="children-title" className="sr-only">
          {t('parent.home.children')}
        </h2>
        <QueryState query={children} skeleton={<CardsSkeleton count={2} />}>
          {(list) =>
            list.length === 0 ? (
              <EmptyState title={t('parent.home.noChild')} />
            ) : (
              <ul className="grid gap-3">
                {list.map((child, index) => (
                  <li key={child.student.id}>
                    <Reveal index={index}>
                      <Link
                        from="/$school"
                        to="/$school/parent/enfants/$studentId"
                        params={{ studentId: child.student.id }}
                        className={cn(
                          'grid gap-4 rounded-3xl border-l-[6px] bg-card p-4 shadow-soft transition active:scale-[0.99]',
                          CYCLE_CLASSES[child.classroom.cycle].border,
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Avatar name={child.name} size="lg" />
                          <span className="grid min-w-0 flex-1 gap-1">
                            <span className="truncate font-display text-lg font-bold">
                              {child.student.firstName}
                            </span>
                            <CycleBadge
                              code={child.classroom.cycle}
                              label={child.classroom.name}
                              className="w-fit"
                            />
                          </span>
                          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
                          <span className="sr-only">
                            {t('parent.home.open', { name: child.student.firstName })}
                          </span>
                        </span>
                        <span className="grid grid-cols-2 gap-2 text-sm">
                          <span className="grid gap-0.5 rounded-2xl bg-muted/70 p-3">
                            <span className="text-xs text-muted-foreground">
                              {t('parent.home.balance')}
                            </span>
                            {child.balance.remaining === 0 ? (
                              <span className="font-semibold text-success-ink">
                                {t('parent.home.upToDate')}
                              </span>
                            ) : (
                              <MoneyAmount
                                value={child.balance.remaining}
                                className="font-display text-base font-bold"
                              />
                            )}
                            {child.balance.overdue > 0 && (
                              <span className="text-xs font-semibold text-destructive-ink">
                                {t('parent.home.overdue', {
                                  amount: formatMoney(child.balance.overdue),
                                })}
                              </span>
                            )}
                          </span>
                          <span className="grid gap-0.5 rounded-2xl bg-muted/70 p-3">
                            {child.average !== null ? (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {t('parent.home.average')}
                                </span>
                                <span className="font-display text-base font-bold tabular">
                                  {formatAverage(child.average)}
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold">
                                {child.daycare?.arrivedAt != null
                                  ? child.daycare.leftAt !== null
                                    ? t('parent.home.daycareOut', {
                                        time: formatTime(child.daycare.leftAt),
                                      })
                                    : t('parent.home.daycareIn', {
                                        time: formatTime(child.daycare.arrivedAt),
                                      })
                                  : t('parent.home.daycareNone')}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {t('parent.home.absences', { count: child.absences })}
                            </span>
                          </span>
                        </span>
                        {child.unjustified > 0 && (
                          <Badge variant="accent" className="w-fit">
                            {t('parent.home.unjustified', { count: child.unjustified })}
                          </Badge>
                        )}
                      </Link>
                    </Reveal>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </section>

      <section aria-labelledby="quick-title" className="grid gap-3">
        <h2 id="quick-title" className="font-display text-lg font-semibold">
          {t('parent.home.quick')}
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {quick.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link
                from="/$school"
                to={to}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-2 text-center text-xs font-semibold shadow-soft"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-orange-100 text-accent-ink">
                  <Icon aria-hidden className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="news-title" className="grid gap-3">
        <h2 id="news-title" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Megaphone aria-hidden className="size-5 text-accent-ink" />
          {t('parent.home.news')}
        </h2>
        <QueryState query={announcements}>
          {(list) => (
            <ul className="grid gap-2">
              {relevantAnnouncements(list, children.data ?? [])
                .slice(0, 3)
                .map((announcement) => (
                  <li key={announcement.id}>
                    <Card>
                      <CardContent className="grid gap-1 p-4">
                        <p className="font-semibold">{announcement.title}</p>
                        <p className="text-sm">{announcement.body}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(announcement.sentAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
            </ul>
          )}
        </QueryState>
      </section>
    </div>
  )
}
