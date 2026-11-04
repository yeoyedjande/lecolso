import { Link } from '@tanstack/react-router'
import { Lock, Printer, Receipt, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { KpiCard } from '@/components/KpiCard'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Can } from '@/features/auth/RequirePermission'
import { formatLongDate, formatMoney, formatTime } from '@/lib/format'
import { toast } from '@/lib/toast'

import { useCashDesk } from '../api'

/** Caisse du jour : total, répartition par moyen de paiement, détail et clôture. */
export function CashDeskPage() {
  const { t } = useTranslation()
  const query = useCashDesk()
  const [closing, setClosing] = useState(false)

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('billing.cash.title')}
        description={
          query.data === undefined
            ? undefined
            : t('billing.cash.description', { date: formatLongDate(query.data.date) })
        }
        actions={
          <Can permission="billing.manage">
            <Button
              variant="outline"
              onClick={() => {
                setClosing(true)
              }}
            >
              <Lock aria-hidden />
              {t('billing.cash.close')}
            </Button>
          </Can>
        }
      />
      <QueryState query={query} skeleton={<CardsSkeleton count={2} />}>
        {(cash) => (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard
                label={t('billing.cash.total')}
                value={cash.total}
                format={formatMoney}
                icon={Wallet}
                tone="accent"
              />
              <KpiCard
                label={t('billing.cash.count')}
                value={cash.payments.length}
                format={String}
                icon={Receipt}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>{t('billing.cash.byMethod')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {cash.byMethod.map((entry) => (
                    <div key={entry.method} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">
                          {t(`paymentMethods.${entry.method}`)}{' '}
                          <span className="text-muted-foreground">({entry.count})</span>
                        </span>
                        <MoneyAmount value={entry.total} className="font-semibold" />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${String(cash.total === 0 ? 0 : (entry.total / cash.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {cash.byMethod.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('billing.cash.empty')}</p>
                  )}
                </CardContent>
              </Card>
              <Card className="overflow-x-auto p-0 lg:col-span-2">
                <CardHeader className="px-5 pt-5">
                  <CardTitle>{t('billing.cash.list')}</CardTitle>
                </CardHeader>
                {cash.payments.length === 0 ? (
                  <EmptyState title={t('billing.cash.empty')} className="m-5" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.time')}</TableHead>
                        <TableHead>{t('students.student')}</TableHead>
                        <TableHead>{t('billing.receipt.method')}</TableHead>
                        <TableHead className="text-right">{t('billing.receipt.amount')}</TableHead>
                        <TableHead className="text-right">{t('students.detail.receipt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cash.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="tabular">{formatTime(payment.paidAt)}</TableCell>
                          <TableCell>
                            <span className="grid">
                              <span className="font-medium">{payment.studentName}</span>
                              <span className="text-xs text-muted-foreground">
                                {payment.classroom}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>{t(`paymentMethods.${payment.method}`)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            <MoneyAmount value={payment.amount} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                to="/gestion/recus/$paymentId"
                                params={{ paymentId: payment.id }}
                              >
                                <Printer aria-hidden />
                                {payment.receiptNumber}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
            <Dialog open={closing} onOpenChange={setClosing}>
              <DialogContent closeLabel={t('common.close')}>
                <DialogTitle>{t('billing.cash.closeTitle')}</DialogTitle>
                <DialogDescription>
                  {t('billing.cash.closeDescription', {
                    amount: formatMoney(
                      cash.byMethod.find((entry) => entry.method === 'cash')?.total ?? 0,
                    ),
                  })}
                </DialogDescription>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">{t('common.cancel')}</Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      setClosing(false)
                      toast(t('billing.cash.closed'), { tone: 'success' })
                    }}
                  >
                    {t('billing.cash.closeConfirm')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </QueryState>
    </div>
  )
}
