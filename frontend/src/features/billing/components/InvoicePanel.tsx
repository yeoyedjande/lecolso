import { BadgePercent, Plus, Trash2 } from 'lucide-react'
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
import { formatDay } from '@/lib/format'
import { toast } from '@/lib/toast'

import { parseAmount } from '../amount'
import { useChangeInvoice, useStudentInvoices, type Invoice, type InvoiceChange } from '../api'

const CONFLICTS = ['discount_exceeds', 'option_present', 'no_amount'] as const

type Form = { kind: 'line' } | { kind: 'discount' } | null

function InvoiceCard({ studentId, invoice }: { studentId: string; invoice: Invoice }) {
  const { t } = useTranslation()
  const change = useChangeInvoice(studentId)
  const [form, setForm] = useState<Form>(null)
  const [label, setLabel] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [option, setOption] = useState('')
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

  const openForm = (kind: 'line' | 'discount') => {
    setForm({ kind })
    setLabel('')
    setAmountText('')
    setDueOn('')
    setError(null)
  }

  const submitForm = async () => {
    if (form === null || amount === null) return
    const ok =
      form.kind === 'line'
        ? await apply(
            { kind: 'addLine', label: label.trim(), amount, dueOn: dueOn === '' ? null : dueOn },
            t('billing.invoice.lineAdded'),
          )
        : await apply(
            { kind: 'addDiscount', amount, reason: label.trim() },
            t('billing.invoice.discountAdded'),
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
                  <MoneyAmount value={item.amount} className="font-semibold" />
                </li>
              ))}
            </ol>
          </section>
        )}

        {(invoice.can_manage || invoice.can_discount) && (
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
          <DialogTitle>
            {form?.kind === 'discount'
              ? t('billing.invoice.discountTitle')
              : t('billing.invoice.lineTitle')}
          </DialogTitle>
          <DialogDescription>
            {form?.kind === 'discount'
              ? t('billing.invoice.discountHint')
              : t('billing.invoice.lineHint')}
          </DialogDescription>
          {error !== null && <FormAlert>{error}</FormAlert>}
          <div className="grid gap-4">
            <Field
              label={
                form?.kind === 'discount' ? t('billing.invoice.reason') : t('billing.invoice.label')
              }
            >
              {(control) => (
                <Input
                  {...control}
                  value={label}
                  maxLength={form?.kind === 'discount' ? 200 : 120}
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
              disabled={amount === null || label.trim().length < 2 || change.isPending}
              onClick={() => void submitForm()}
            >
              {form?.kind === 'discount'
                ? t('billing.invoice.confirmDiscount')
                : t('billing.invoice.confirmLine')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
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
