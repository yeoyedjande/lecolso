import { Link } from '@tanstack/react-router'
import { ArrowRightLeft, BadgePercent, Plus, Printer, Trash2, Undo2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MoneyAmount } from '@/components/MoneyAmount'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
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
import { NativeSelect } from '@/components/ui/native-select'
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
import { formatDate, formatDay, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

import { parseAmount } from '../amount'
import {
  PAYMENT_METHODS,
  useChangeInvoice,
  useStudentInvoices,
  type Invoice,
  type InvoiceChange,
  type PaymentMethod,
} from '../api'

const CONFLICTS = [
  'discount_exceeds',
  'option_present',
  'no_amount',
  'student_left',
  'no_credit',
  'amount_exceeds_credit',
  'target_not_due',
  'other_payer',
  'cash_closed',
] as const

type FormKind = 'line' | 'discount' | 'refund' | 'transfer'
type Form = { kind: FormKind } | null

/** Situation de la facture : réglé, reste, retard, trop-perçu. */
function BalanceSummary({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation()
  const { balance } = invoice
  const items = [
    ['settled', balance.settled, ''],
    ['remaining', balance.remaining, ''],
    ['overdue', balance.overdue, balance.overdue > 0 ? 'text-destructive-ink' : ''],
    ...(balance.credit > 0 ? ([['credit', balance.credit, 'text-success-ink']] as const) : []),
  ] as const
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([key, value, tone]) => (
        <div key={key} className="grid gap-0.5 rounded-2xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">{t(`billing.invoice.balance.${key}`)}</dt>
          <dd>
            <MoneyAmount value={value} className={cn('font-display text-lg font-bold', tone)} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function InvoiceCard({ studentId, invoice }: { studentId: string; invoice: Invoice }) {
  const { t } = useTranslation()
  const change = useChangeInvoice()
  const [form, setForm] = useState<Form>(null)
  const [label, setLabel] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [option, setOption] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState<string | null>(null)
  const amount = parseAmount(amountText)

  const apply = async (input: InvoiceChange, done: string): Promise<boolean> => {
    setError(null)
    try {
      await change.mutateAsync({ invoiceId: invoice.id, change: input })
      toast(done, { tone: 'success' })
      return true
    } catch (caught) {
      const code =
        caught instanceof ConflictError
          ? CONFLICTS.find((candidate) => candidate === caught.code)
          : undefined
      const message =
        code !== undefined
          ? t(`billing.invoice.conflicts.${code}`)
          : caught instanceof ValidationError
            ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
            : t('common.error')
      if (form === null) toast(message, { tone: 'error' })
      else setError(message)
      return false
    }
  }

  const openForm = (kind: FormKind) => {
    setForm({ kind })
    setLabel('')
    setAmountText(kind === 'refund' || kind === 'transfer' ? String(invoice.balance.credit) : '')
    setDueOn('')
    setMethod('cash')
    setReference('')
    setTarget(invoice.credit_targets[0]?.invoice_id ?? '')
    setError(null)
  }

  const submitForm = async () => {
    if (form === null || amount === null) return
    const reason = label.trim()
    const ok =
      form.kind === 'line'
        ? await apply(
            { kind: 'addLine', label: reason, amount, dueOn: dueOn === '' ? null : dueOn },
            t('billing.invoice.lineAdded'),
          )
        : form.kind === 'discount'
          ? await apply({ kind: 'addDiscount', amount, reason }, t('billing.invoice.discountAdded'))
          : form.kind === 'refund'
            ? await apply(
                {
                  kind: 'refund',
                  amount,
                  method,
                  reference: method === 'cash' ? null : reference.trim(),
                  reason,
                },
                t('billing.invoice.refundDone', { amount: formatMoney(amount) }),
              )
            : await apply(
                { kind: 'transfer', toInvoiceId: target, amount, reason },
                t('billing.invoice.transferDone', { amount: formatMoney(amount) }),
              )
    if (ok) setForm(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t('billing.invoice.title', { year: invoice.academic_year.label })}
          <Badge variant="secondary">{invoice.classroom_name}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {invoice.payer === null
            ? t('billing.invoice.noPayer')
            : t('billing.invoice.payer', { name: invoice.payer.name })}
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {invoice.left_on !== null && (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm">
            {t('billing.invoice.leftOn', { date: formatDate(invoice.left_on) })}
          </p>
        )}
        <BalanceSummary invoice={invoice} />
        {invoice.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('billing.invoice.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('billing.invoice.line')}</TableHead>
                <TableHead className="text-right">{t('billing.invoice.amount')}</TableHead>
                {invoice.can_manage && (
                  <TableHead className="w-12">
                    <span className="sr-only">{t('billing.invoice.actions')}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => {
                const removable =
                  (line.kind === 'manual' && invoice.can_manage) ||
                  (line.kind === 'discount' && invoice.can_discount) ||
                  (line.kind === 'fee' && line.is_optional && invoice.can_manage)
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <span className="grid">
                        <span className="font-medium">{line.label}</span>
                        {line.reason !== null && (
                          <span className="text-xs text-muted-foreground">{line.reason}</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell
                      className={
                        line.amount < 0 ? 'text-right text-success-ink' : 'text-right font-semibold'
                      }
                    >
                      <MoneyAmount value={line.amount} />
                    </TableCell>
                    {invoice.can_manage && (
                      <TableCell>
                        {removable && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive-ink"
                            disabled={change.isPending}
                            aria-label={t('billing.invoice.removeOf', { label: line.label })}
                            onClick={() =>
                              void apply(
                                line.kind === 'fee' && line.fee_type_id !== null
                                  ? { kind: 'removeOption', feeTypeId: line.fee_type_id }
                                  : { kind: 'removeLine', lineId: line.id },
                                t('billing.invoice.removed', { label: line.label }),
                              )
                            }
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              <TableRow>
                <TableCell className="font-semibold">{t('billing.invoice.total')}</TableCell>
                <TableCell className="text-right font-display text-lg font-bold">
                  <MoneyAmount value={invoice.total} />
                </TableCell>
                {invoice.can_manage && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        )}

        {invoice.schedule.length > 0 && (
          <section className="grid gap-2" aria-labelledby={`schedule-${invoice.id}`}>
            <h3 id={`schedule-${invoice.id}`} className="font-semibold">
              {t('billing.invoice.schedule')}
            </h3>
            <ol className="grid gap-1 text-sm">
              {invoice.schedule.map((item) => (
                <li
                  key={item.due_on}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
                >
                  <span>
                    <span className="tabular font-medium">{formatDay(item.due_on)}</span>
                    <span className="text-muted-foreground">{` · ${item.label}`}</span>
                  </span>
                  <span className="grid justify-items-end">
                    <MoneyAmount value={item.amount} className="font-semibold" />
                    <span
                      className={cn(
                        'text-xs',
                        item.settled >= item.amount ? 'text-success-ink' : 'text-muted-foreground',
                      )}
                    >
                      {item.settled >= item.amount
                        ? t('billing.invoice.settled')
                        : item.settled > 0
                          ? t('billing.invoice.partlySettled', {
                              amount: formatMoney(item.settled),
                            })
                          : t('billing.invoice.unsettled')}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <MoneyHistory invoice={invoice} />

        {(invoice.can_collect || invoice.can_refund) && (
          <div className="flex flex-wrap gap-2">
            {invoice.can_collect && invoice.balance.remaining > 0 && (
              <Button asChild variant="accent">
                <Link
                  from="/$school"
                  to="/$school/encaissements"
                  search={{ eleve: studentId, facture: invoice.id }}
                >
                  <Wallet aria-hidden />
                  {t('billing.invoice.collect')}
                </Link>
              </Button>
            )}
            {invoice.can_refund && invoice.balance.credit > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    openForm('refund')
                  }}
                >
                  <Undo2 aria-hidden />
                  {t('billing.invoice.refund')}
                </Button>
                {invoice.credit_targets.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      openForm('transfer')
                    }}
                  >
                    <ArrowRightLeft aria-hidden />
                    {t('billing.invoice.transfer')}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {(invoice.can_manage || invoice.can_discount) && invoice.left_on === null && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            {invoice.can_manage && invoice.available_options.length > 0 && (
              <div className="flex flex-wrap items-end gap-2">
                <Field label={t('billing.invoice.addOption')}>
                  {(control) => (
                    <NativeSelect
                      {...control}
                      value={option}
                      onChange={(event) => {
                        setOption(event.target.value)
                      }}
                    >
                      <option value="">{t('billing.invoice.chooseOption')}</option>
                      {invoice.available_options.map((candidate) => (
                        <option key={candidate.fee_type_id} value={candidate.fee_type_id}>
                          {candidate.name}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
                <Button
                  variant="outline"
                  disabled={option === '' || change.isPending}
                  onClick={() => {
                    void apply(
                      { kind: 'addOption', feeTypeId: option },
                      t('billing.invoice.optionAdded'),
                    ).then((ok) => {
                      if (ok) setOption('')
                    })
                  }}
                >
                  <Plus aria-hidden />
                  {t('billing.invoice.add')}
                </Button>
              </div>
            )}
            {invoice.can_manage && (
              <Button
                variant="outline"
                onClick={() => {
                  openForm('line')
                }}
              >
                <Plus aria-hidden />
                {t('billing.invoice.addLine')}
              </Button>
            )}
            {invoice.can_discount && (
              <Button
                variant="outline"
                onClick={() => {
                  openForm('discount')
                }}
              >
                <BadgePercent aria-hidden />
                {t('billing.invoice.addDiscount')}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) setForm(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{t(`billing.invoice.forms.${form?.kind ?? 'line'}.title`)}</DialogTitle>
          <DialogDescription>
            {t(`billing.invoice.forms.${form?.kind ?? 'line'}.hint`, {
              amount: formatMoney(invoice.balance.credit),
            })}
          </DialogDescription>
          {error !== null && <FormAlert>{error}</FormAlert>}
          <div className="grid gap-4">
            {form?.kind === 'transfer' && (
              <Field label={t('billing.invoice.transferTo')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={target}
                    onChange={(event) => {
                      setTarget(event.target.value)
                    }}
                  >
                    {invoice.credit_targets.map((candidate) => (
                      <option key={candidate.invoice_id} value={candidate.invoice_id}>
                        {t('billing.invoice.transferTarget', {
                          name: candidate.student_name,
                          year: candidate.academic_year_label,
                          amount: formatMoney(candidate.remaining),
                        })}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
            )}
            <Field
              label={
                form?.kind === 'line' ? t('billing.invoice.label') : t('billing.invoice.reason')
              }
            >
              {(control) => (
                <Input
                  {...control}
                  value={label}
                  maxLength={form?.kind === 'line' ? 120 : 200}
                  onChange={(event) => {
                    setLabel(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field
              label={t('billing.invoice.amountFcfa')}
              error={amountText !== '' && amount === null ? t('billing.fees.invalid') : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountText}
                  onChange={(event) => {
                    setAmountText(event.target.value)
                  }}
                />
              )}
            </Field>
            {form?.kind === 'refund' && (
              <>
                <Field label={t('billing.collect.method')}>
                  {(control) => (
                    <NativeSelect
                      {...control}
                      value={method}
                      onChange={(event) => {
                        setMethod(
                          PAYMENT_METHODS.find((candidate) => candidate === event.target.value) ??
                            'cash',
                        )
                      }}
                    >
                      {PAYMENT_METHODS.map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {t(`paymentMethods.${candidate}`)}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
                {method !== 'cash' && (
                  <Field label={t('billing.collect.reference')}>
                    {(control) => (
                      <Input
                        {...control}
                        value={reference}
                        maxLength={60}
                        onChange={(event) => {
                          setReference(event.target.value)
                        }}
                      />
                    )}
                  </Field>
                )}
              </>
            )}
            {form?.kind === 'line' && (
              <Field label={t('billing.invoice.dueOn')} hint={t('billing.invoice.dueOnHint')}>
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={dueOn}
                    onChange={(event) => {
                      setDueOn(event.target.value)
                    }}
                  />
                )}
              </Field>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="accent"
              disabled={
                amount === null ||
                label.trim().length < (form?.kind === 'line' ? 2 : 3) ||
                (form?.kind === 'refund' && method !== 'cash' && reference.trim().length < 3) ||
                (form?.kind === 'transfer' && target === '') ||
                change.isPending
              }
              onClick={() => void submitForm()}
            >
              {t(`billing.invoice.forms.${form?.kind ?? 'line'}.confirm`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/** Paiements (annulés compris), remboursements et reports de trop-perçu d'une facture. */
function MoneyHistory({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation()
  if (
    invoice.payments.length === 0 &&
    invoice.refunds.length === 0 &&
    invoice.transfers.length === 0
  ) {
    return <p className="text-sm text-muted-foreground">{t('billing.invoice.noPayment')}</p>
  }
  return (
    <section className="grid gap-2" aria-labelledby={`payments-${invoice.id}`}>
      <h3 id={`payments-${invoice.id}`} className="font-semibold">
        {t('billing.invoice.payments')}
      </h3>
      <ul className="grid gap-1 text-sm">
        {invoice.payments.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="grid min-w-0">
              <span className="font-medium">
                {formatDate(payment.paid_at)} · {t(`paymentMethods.${payment.method}`)}
              </span>
              {payment.cancellation !== null && (
                <span className="text-xs text-destructive-ink">
                  {t('billing.invoice.paymentCancelled', { reason: payment.cancellation.reason })}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <MoneyAmount
                value={payment.amount}
                className={cn('font-semibold', payment.cancellation !== null && 'line-through')}
              />
              <Button asChild variant="ghost" size="sm">
                <Link
                  from="/$school"
                  to="/$school/recus/$paymentId"
                  params={{ paymentId: payment.id }}
                >
                  <Printer aria-hidden />
                  {payment.receipt_number}
                </Link>
              </Button>
            </span>
          </li>
        ))}
        {invoice.refunds.map((refund) => (
          <li
            key={refund.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="grid min-w-0">
              <span className="font-medium">
                {t('billing.invoice.refundLine', {
                  date: formatDate(refund.refunded_at),
                  number: refund.number,
                })}
              </span>
              <span className="text-xs text-muted-foreground">{refund.reason}</span>
            </span>
            <MoneyAmount value={-refund.amount} className="font-semibold" />
          </li>
        ))}
        {invoice.transfers.map((transfer) => (
          <li
            key={transfer.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="grid min-w-0">
              <span className="font-medium">
                {t(
                  transfer.direction === 'out'
                    ? 'billing.invoice.transferOut'
                    : 'billing.invoice.transferIn',
                  { name: transfer.other_student_name, year: transfer.other_year_label },
                )}
              </span>
              <span className="text-xs text-muted-foreground">{transfer.reason}</span>
            </span>
            <MoneyAmount
              value={transfer.direction === 'out' ? -transfer.amount : transfer.amount}
              className="font-semibold"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Onglet « Frais » de la fiche élève (vraie API) : factures de l'élève, la plus récente d'abord. */
export function InvoicePanel({ studentId }: { studentId: string }) {
  const { t } = useTranslation()
  const query = useStudentInvoices(studentId)

  return (
    <QueryState query={query}>
      {(invoices) =>
        invoices === null || invoices.length === 0 ? (
          <EmptyState
            title={t('billing.invoice.noneTitle')}
            description={t('billing.invoice.noneDescription')}
          />
        ) : (
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} studentId={studentId} invoice={invoice} />
            ))}
          </div>
        )
      }
    </QueryState>
  )
}
