import { Link } from '@tanstack/react-router'
import { Banknote, Lock, Printer, Receipt, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { KpiCard } from '@/components/KpiCard'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
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
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatLongDate, formatMoney, formatTime } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { parseAmountOrZero } from '../amount'
import {
  PAYMENT_METHODS,
  useCashDesk,
  useCloseCashSession,
  type CashSession,
  type PaymentMethod,
} from '../api'

const MOVEMENTS = ['payment', 'cancellation', 'refund'] as const

function movementLabel(kind: string): (typeof MOVEMENTS)[number] {
  return MOVEMENTS.find((candidate) => candidate === kind) ?? 'payment'
}

/** Moyen de paiement d'une ligne de caisse (chaîne de l'API) ; « virement » par défaut, jamais atteint. */
function methodOf(value: string): PaymentMethod {
  return PAYMENT_METHODS.find((method) => method === value) ?? 'transfer'
}

function CloseDialog({
  session,
  open,
  onOpenChange,
}: {
  session: CashSession
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const close = useCloseCashSession()
  const [countedText, setCountedText] = useState(String(Math.max(0, session.expected_cash)))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const counted = parseAmountOrZero(countedText)
  const difference = (counted ?? 0) - session.expected_cash
  const needsNote = difference !== 0 && note.trim() === ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle>{t('billing.cash.closeTitle')}</DialogTitle>
        <DialogDescription>
          {t('billing.cash.closeDescription', { amount: formatMoney(session.expected_cash) })}
        </DialogDescription>
        {error !== null && <FormAlert>{error}</FormAlert>}
        <div className="grid gap-4">
          <Field
            label={t('billing.cash.counted')}
            hint={t('billing.cash.countedHint')}
            error={counted === null ? t('billing.fees.invalid') : undefined}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                autoComplete="off"
                className="font-display text-xl font-bold"
                value={countedText}
                onChange={(event) => {
                  setCountedText(event.target.value)
                }}
              />
            )}
          </Field>
          <p
            className={cn(
              'rounded-xl px-3 py-2 text-sm font-medium',
              difference === 0 ? 'bg-success-soft text-success-ink' : 'bg-muted text-foreground',
            )}
            role="status"
          >
            {difference === 0
              ? t('billing.cash.noDifference')
              : t('billing.cash.difference', {
                  amount: `${difference > 0 ? '+' : '−'}${formatMoney(Math.abs(difference))}`,
                })}
          </p>
          <Field
            label={t('billing.cash.note')}
            hint={
              difference === 0 ? t('billing.cash.noteOptional') : t('billing.cash.noteRequired')
            }
          >
            {(control) => (
              <Input
                {...control}
                value={note}
                maxLength={200}
                onChange={(event) => {
                  setNote(event.target.value)
                }}
              />
            )}
          </Field>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            disabled={counted === null || needsNote || close.isPending}
            onClick={() => {
              if (counted === null) return
              setError(null)
              close
                .mutateAsync({
                  sessionId: session.id,
                  countedCash: counted,
                  note: note.trim() === '' ? null : note.trim(),
                })
                .then(() => {
                  onOpenChange(false)
                  toast(t('billing.cash.closed'), { tone: 'success' })
                })
                .catch((caught: unknown) => {
                  setError(
                    caught instanceof ConflictError && caught.code === 'cash_closed'
                      ? t('billing.cash.conflicts.cash_closed')
                      : caught instanceof ValidationError
                        ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
                        : t('common.error'),
                  )
                })
            }}
          >
            <Lock aria-hidden />
            {t('billing.cash.closeConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionCard({ session }: { session: CashSession }) {
  const { t } = useTranslation()
  const [closing, setClosing] = useState(false)
  const closed = session.closed_at !== null

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {session.is_mine
              ? t('billing.cash.mine')
              : t('billing.cash.of', { name: session.cashier_name })}
            <Badge variant={closed ? 'outline' : 'success'}>
              {closed ? t('billing.cash.statusClosed') : t('billing.cash.statusOpen')}
            </Badge>
          </CardTitle>
          {closed && session.closed_at !== null && (
            <p className="text-sm text-muted-foreground">
              {t('billing.cash.closedAt', { time: formatTime(session.closed_at) })}
            </p>
          )}
        </div>
        {session.is_mine && !closed && (
          <Button
            variant="outline"
            onClick={() => {
              setClosing(true)
            }}
          >
            <Lock aria-hidden />
            {t('billing.cash.close')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-6">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-0.5 rounded-2xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">{t('billing.cash.net')}</dt>
            <dd>
              <MoneyAmount value={session.net_total} className="font-display text-xl font-bold" />
            </dd>
          </div>
          <div className="grid gap-0.5 rounded-2xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">{t('billing.cash.expected')}</dt>
            <dd>
              <MoneyAmount
                value={session.expected_cash}
                className="font-display text-xl font-bold"
              />
            </dd>
          </div>
          {closed && session.counted_cash !== null && (
            <div className="grid gap-0.5 rounded-2xl bg-muted/60 p-4">
              <dt className="text-sm text-muted-foreground">{t('billing.cash.countedShort')}</dt>
              <dd className="grid">
                <MoneyAmount
                  value={session.counted_cash}
                  className="font-display text-xl font-bold"
                />
                {session.difference !== null && session.difference !== 0 && (
                  <span className="text-sm font-medium text-destructive-ink">
                    {t('billing.cash.difference', {
                      amount: `${session.difference > 0 ? '+' : '−'}${formatMoney(Math.abs(session.difference))}`,
                    })}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
        {session.note !== null && (
          <p className="text-sm">
            <span className="font-medium">{t('billing.cash.note')} : </span>
            {session.note}
          </p>
        )}

        <section className="grid gap-2" aria-label={t('billing.cash.byMethod')}>
          <h3 className="font-semibold">{t('billing.cash.byMethod')}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing.receipt.method')}</TableHead>
                  <TableHead className="text-right">{t('billing.cash.collected')}</TableHead>
                  <TableHead className="text-right">{t('billing.cash.cancelled')}</TableHead>
                  <TableHead className="text-right">{t('billing.cash.refunded')}</TableHead>
                  <TableHead className="text-right">{t('billing.cash.net')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.methods.map((row) => (
                  <TableRow key={row.method}>
                    <TableCell className="font-medium">
                      {t(`paymentMethods.${methodOf(row.method)}`)}{' '}
                      <span className="text-muted-foreground">({row.count})</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={row.collected} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={row.cancelled} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={row.refunded} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <MoneyAmount value={row.net} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="grid gap-2" aria-label={t('billing.cash.list')}>
          <h3 className="font-semibold">{t('billing.cash.list')}</h3>
          {session.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('billing.cash.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.time')}</TableHead>
                    <TableHead>{t('billing.cash.movement')}</TableHead>
                    <TableHead>{t('students.student')}</TableHead>
                    <TableHead>{t('billing.receipt.method')}</TableHead>
                    <TableHead className="text-right">{t('billing.receipt.amount')}</TableHead>
                    <TableHead className="text-right">{t('billing.cash.document')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.movements.map((movement) => (
                    <TableRow key={`${movement.kind}-${movement.number}`}>
                      <TableCell className="tabular">{formatTime(movement.at)}</TableCell>
                      <TableCell>
                        <span className="grid">
                          <span className="font-medium">
                            {t(`billing.cash.movements.${movementLabel(movement.kind)}`)}
                          </span>
                          {movement.cancelled && (
                            <span className="text-xs text-destructive-ink">
                              {t('billing.cash.cancelledSince')}
                            </span>
                          )}
                          {movement.reason !== null && (
                            <span className="text-xs text-muted-foreground">{movement.reason}</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{movement.student_name}</TableCell>
                      <TableCell>{t(`paymentMethods.${methodOf(movement.method)}`)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          movement.amount < 0 && 'text-destructive-ink',
                        )}
                      >
                        <MoneyAmount value={movement.amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.payment_id === null ? (
                          <span className="tabular text-sm">{movement.number}</span>
                        ) : (
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              from="/$school"
                              to="/$school/recus/$paymentId"
                              params={{ paymentId: movement.payment_id }}
                            >
                              <Printer aria-hidden />
                              {movement.number}
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </CardContent>
      {session.is_mine && !closed && (
        <CloseDialog
          key={String(closing)}
          session={session}
          open={closing}
          onOpenChange={setClosing}
        />
      )}
    </Card>
  )
}

/**
 * Caisse du jour (vraie API) : une caisse par caissier, mouvements (encaissements, annulations, remboursements),
 * totaux par moyen et clôture de sa caisse (espèces comptées, écart justifié).
 */
export function CashDeskPage() {
  const { t } = useTranslation()
  const [date, setDate] = useState<string | null>(null)
  const query = useCashDesk(date)

  return (
    <div className="grid grid-cols-1 gap-6">
      <ScreenHeader
        title={t('billing.cash.title')}
        demo={false}
        description={
          query.data === undefined
            ? undefined
            : t('billing.cash.description', { date: formatLongDate(query.data.date) })
        }
        actions={
          <Field label={t('billing.cash.day')}>
            {(control) => (
              <Input
                {...control}
                type="date"
                className="w-44"
                value={date ?? query.data?.date ?? ''}
                onChange={(event) => {
                  setDate(event.target.value === '' ? null : event.target.value)
                }}
              />
            )}
          </Field>
        }
      />
      <QueryState query={query} skeleton={<CardsSkeleton count={2} />}>
        {(desk) => {
          const mine = desk.sessions.find((session) => session.is_mine)
          const count = desk.sessions.reduce(
            (sum, session) =>
              sum + session.movements.filter((movement) => movement.kind === 'payment').length,
            0,
          )
          return (
            <div className="grid grid-cols-1 gap-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                  label={
                    desk.all_cashiers ? t('billing.cash.totalSchool') : t('billing.cash.total')
                  }
                  value={desk.net_total}
                  format={formatMoney}
                  icon={Wallet}
                  tone="accent"
                />
                <KpiCard
                  label={t('billing.cash.count')}
                  value={count}
                  format={String}
                  icon={Receipt}
                />
                <KpiCard
                  label={t('billing.cash.expectedMine')}
                  value={mine?.expected_cash ?? 0}
                  format={formatMoney}
                  icon={Banknote}
                />
              </div>
              {desk.sessions.length === 0 ? (
                <EmptyState
                  title={t('billing.cash.emptyTitle')}
                  description={t('billing.cash.emptyDescription')}
                />
              ) : (
                desk.sessions.map((session) => <SessionCard key={session.id} session={session} />)
              )}
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}
