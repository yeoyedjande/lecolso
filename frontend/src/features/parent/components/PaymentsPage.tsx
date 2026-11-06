import { Link } from '@tanstack/react-router'
import { ChevronRight, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { MoneyAmount } from '@/components/MoneyAmount'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDay, formatMoney } from '@/lib/format'

import { useMyChildren } from '../api'

/**
 * Paiements : reste à payer de chaque enfant, accès à son échéancier, ses paiements et ses reçus. Le paiement par
 * Mobile Money arrive au lot 10 (encaissement réel, webhook de l'opérateur).
 */
export function PaymentsPage() {
  const { t } = useTranslation()
  const children = useMyChildren()

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('parent.payments.title')}</h1>
        <p className="text-muted-foreground">{t('parent.payments.subtitle')}</p>
      </div>
      <QueryState query={children} skeleton={<CardsSkeleton count={2} />}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('parent.home.noChild')} />
          ) : (
            <ul className="grid gap-3">
              {list.map((child) => (
                <li key={child.student.id}>
                  <Card className="p-0">
                    <Link
                      from="/$school"
                      to="/$school/parent/enfants/$studentId"
                      params={{ studentId: child.student.id }}
                      search={{ onglet: 'frais' }}
                      className="flex items-center gap-3 rounded-[inherit] p-4"
                    >
                      <Avatar name={child.student.full_name} photoUrl={child.student.photo_url} />
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate font-semibold">{child.student.full_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {child.next_due_on === null
                            ? t('parent.payments.noNext')
                            : t('parent.payments.nextOn', { date: formatDay(child.next_due_on) })}
                        </span>
                        {child.overdue !== null && child.overdue > 0 && (
                          <span className="text-sm font-semibold text-destructive-ink">
                            {t('parent.home.overdue', { amount: formatMoney(child.overdue) })}
                          </span>
                        )}
                      </span>
                      {child.remaining !== null && (
                        <MoneyAmount value={child.remaining} className="font-display font-bold" />
                      )}
                      <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
                      <span className="sr-only">
                        {t('parent.payments.detailsOf', { name: child.student.first_name })}
                      </span>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
      <Card>
        <CardContent className="grid gap-3 p-4">
          <Button size="lg" variant="accent" disabled>
            <Wallet aria-hidden />
            {t('parent.payments.pay')}
          </Button>
          <p className="text-sm text-muted-foreground">{t('parent.payments.soon')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
