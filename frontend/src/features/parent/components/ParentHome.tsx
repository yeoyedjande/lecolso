import { Link } from '@tanstack/react-router'
import { CalendarX2, ChevronRight, MessageCircle, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useMe } from '@/features/auth/api'
import { CYCLE_CLASSES, cycleTone } from '@/lib/cycles'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useMyChildren, type ChildSummary } from '../api'

function Presence({ child }: { child: ChildSummary }) {
  const { t } = useTranslation()
  if (child.presence === null) {
    return <span className="text-muted-foreground">{t('parent.home.presence.unknown')}</span>
  }
  return (
    <span
      className={cn(
        'font-semibold',
        child.presence === 'present' && 'text-success-ink',
        child.presence === 'absent' && 'text-destructive-ink',
        child.presence === 'late' && 'text-accent-ink',
      )}
    >
      {child.presence === 'absent'
        ? t('parent.home.presence.absent')
        : child.presence === 'late'
          ? t('parent.home.presence.late')
          : t('parent.home.presence.present')}
    </span>
  )
}

/** Accueil parent : une carte par enfant (présence du jour, reste à payer, absences à justifier) et raccourcis. */
export function ParentHome() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const children = useMyChildren()
  const firstName = profile?.name.split(' ')[0] ?? ''

  const quick = [
    { to: '/$school/parent/paiements', icon: Wallet, label: t('parent.home.pay') },
    { to: '/$school/parent/justifier', icon: CalendarX2, label: t('parent.home.justify') },
    { to: '/$school/parent/messages', icon: MessageCircle, label: t('parent.home.messages') },
  ] as const

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
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
                          CYCLE_CLASSES[cycleTone(child.student.cycle?.code)].border,
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Avatar
                            name={child.student.full_name}
                            photoUrl={child.student.photo_url}
                            size="lg"
                          />
                          <span className="grid min-w-0 flex-1 gap-1">
                            <span className="truncate font-display text-lg font-bold">
                              {child.student.first_name}
                            </span>
                            {child.student.classroom !== null && (
                              <CycleBadge
                                code={child.student.cycle?.code}
                                label={child.student.classroom.name ?? ''}
                                className="w-fit"
                              />
                            )}
                          </span>
                          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
                          <span className="sr-only">
                            {t('parent.home.open', { name: child.student.first_name })}
                          </span>
                        </span>
                        <span className="grid grid-cols-2 gap-2 text-sm">
                          <span className="grid gap-0.5 rounded-2xl bg-muted/70 p-3">
                            <span className="text-xs text-muted-foreground">
                              {t('parent.home.balance')}
                            </span>
                            {child.remaining === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : child.remaining === 0 ? (
                              <span className="font-semibold text-success-ink">
                                {t('parent.home.upToDate')}
                              </span>
                            ) : (
                              <MoneyAmount
                                value={child.remaining}
                                className="font-display text-base font-bold"
                              />
                            )}
                            {child.overdue !== null && child.overdue > 0 && (
                              <span className="text-xs font-semibold text-destructive-ink">
                                {t('parent.home.overdue', { amount: formatMoney(child.overdue) })}
                              </span>
                            )}
                          </span>
                          <span className="grid gap-0.5 rounded-2xl bg-muted/70 p-3">
                            <span className="text-xs text-muted-foreground">
                              {t('parent.home.today')}
                            </span>
                            <Presence child={child} />
                          </span>
                        </span>
                        {child.absences_to_justify > 0 && (
                          <Badge variant="accent" className="w-fit">
                            {t('parent.home.unjustified', { count: child.absences_to_justify })}
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
    </div>
  )
}
