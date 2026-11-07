import { Link, useNavigate } from '@tanstack/react-router'
import {
  Banknote,
  CheckCircle2,
  Printer,
  RotateCcw,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { FormAlert } from '@/features/auth/components/FormAlert'
import {
  useStudentFile,
  useStudentList,
  type StudentFile,
  type StudentListFilters,
} from '@/features/students/api'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatDay, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

import { parseAmount } from '../amount'
import {
  PAYMENT_METHODS,
  useRecordPayment,
  useStudentInvoices,
  type Invoice,
  type PaymentMethod,
  type Receipt,
} from '../api'

const CONFLICTS = ['nothing_due', 'amount_exceeds', 'cash_closed', 'reference_used'] as const

/**
 * Facture à encaisser : celle choisie (lien « Encaisser » d'une facture), sinon celle de l'année en cours si elle a un
 * reste dû, sinon la plus récente qui en a un (dette d'une année précédente), sinon celle de l'année en cours.
 */
function invoiceToCollect(invoices: Invoice[], chosen: string | undefined): Invoice | undefined {
  const current = invoices.find((invoice) => invoice.academic_year.is_current)
  return (
    invoices.find((invoice) => invoice.id === chosen) ??
    (current !== undefined && current.balance.remaining > 0 ? current : undefined) ??
    invoices.find((invoice) => invoice.balance.remaining > 0) ??
    current ??
    invoices[0]
  )
}

function StudentPicker({ onPick }: { onPick: (id: string) => void }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const filters: StudentListFilters = {
    search: deferred,
    cycleId: null,
    classroomId: null,
    status: 'all',
  }
  const results = useStudentList(filters)
  const searching = deferred.trim().length >= 2

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          autoFocus
          aria-label={t('billing.collect.search')}
          placeholder={t('billing.collect.search')}
          className="h-12 pl-10 text-base"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
        />
      </div>
      {searching && (
        <QueryState query={results}>
          {(data) => {
            const rows = data.pages.flatMap((page) => page.data)
            return rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('billing.collect.noResult')}</p>
            ) : (
              <ul className="grid gap-2">
                {rows.slice(0, 6).map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(row.id)
                      }}
                      aria-label={t('billing.collect.pick', { name: row.full_name })}
                      className="flex w-full min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-accent"
                    >
                      <Avatar name={row.full_name} photoUrl={row.photo_url} size="sm" />
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate font-semibold">{row.full_name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {row.matricule}
                          {row.primary_contact === null ? '' : ` · ${row.primary_contact.name}`}
                        </span>
                      </span>
                      {row.enrollment !== null && (
                        <CycleBadge
                          code={row.enrollment.cycle_code}
                          label={row.enrollment.classroom_name}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )
          }}
        </QueryState>
      )}
    </div>
  )
}

function PaymentForm({
  student,
  invoice,
  onDone,
  onChange,
}: {
  student: StudentFile
  invoice: Invoice
  onDone: (receipt: Receipt) => void
  onChange: () => void
}) {
  const { t } = useTranslation()
  const record = useRecordPayment()
  const { balance } = invoice
  const [amountText, setAmountText] = useState(balance.overdue > 0 ? String(balance.overdue) : '')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const amount = parseAmount(amountText)
  const amountError =
    amount === null
      ? t('billing.collect.errors.amount')
      : amount > balance.remaining
        ? t('billing.collect.errors.tooMuch', { amount: formatMoney(balance.remaining) })
        : undefined
  const referenceError =
    method !== 'cash' && reference.trim() === '' ? t('billing.collect.errors.reference') : undefined
  const suggestions = [
    ['suggestOverdue', balance.overdue],
    ['suggestNext', balance.next === null ? 0 : balance.next.amount],
    ['suggestAll', balance.remaining],
  ] as const

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar name={student.full_name} photoUrl={student.photo_url} size="lg" />
            <div className="grid min-w-0 gap-1">
              <p className="font-display text-xl font-bold break-words">{student.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {t('billing.collect.invoiceOf', {
                  classroom: invoice.classroom_name,
                  year: invoice.academic_year.label,
                })}
              </p>
            </div>
          </div>
          <dl className="grid gap-3 rounded-2xl bg-muted/60 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{t('billing.collect.remaining')}</dt>
              <dd>
                <MoneyAmount
                  value={balance.remaining}
                  className="font-display text-2xl font-bold"
                />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{t('billing.collect.overdue')}</dt>
              <dd>
                <MoneyAmount
                  value={balance.overdue}
                  className={cn('font-semibold', balance.overdue > 0 && 'text-destructive-ink')}
                />
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {balance.next !== null
              ? t('billing.collect.next', {
                  label: balance.next.label,
                  amount: formatMoney(balance.next.amount),
                  date: formatDay(balance.next.due_on),
                })
              : t('billing.collect.upToDate')}
          </p>
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={onChange}>
            <RotateCcw aria-hidden />
            {t('billing.collect.change')}
          </Button>
        </CardContent>
      </Card>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          if (amountError === undefined && referenceError === undefined) setConfirming(true)
        }}
      >
        <Card>
          <CardContent className="grid gap-5 pt-6">
            <Field
              label={t('billing.collect.amount')}
              hint={t('billing.collect.amountHint')}
              error={submitted ? amountError : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  inputMode="numeric"
                  className="h-14 font-display text-2xl font-bold"
                  value={amountText}
                  onChange={(event) => {
                    setAmountText(event.target.value)
                  }}
                />
              )}
            </Field>
            <div className="grid gap-2">
              <p className="text-sm font-medium">{t('billing.collect.suggestions')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter(([, value]) => value > 0)
                  .map(([key, value]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setAmountText(String(value))
                      }}
                    >
                      {t(`billing.collect.${key}`)} · {formatMoney(value)}
                    </Button>
                  ))}
              </div>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">{t('billing.collect.method')}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAYMENT_METHODS.map((candidate) => (
                  <label
                    key={candidate}
                    className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border bg-surface px-3 text-sm font-medium transition has-[:checked]:border-accent has-[:checked]:bg-orange-100 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/20 dark:has-[:checked]:bg-orange/15"
                  >
                    <input
                      type="radio"
                      name="method"
                      value={candidate}
                      checked={method === candidate}
                      onChange={() => {
                        setMethod(candidate)
                      }}
                      className="sr-only"
                    />
                    {candidate === 'cash' ? (
                      <Banknote aria-hidden className="size-4 shrink-0" />
                    ) : candidate === 'cheque' || candidate === 'transfer' ? (
                      <Wallet aria-hidden className="size-4 shrink-0" />
                    ) : (
                      <Smartphone aria-hidden className="size-4 shrink-0" />
                    )}
                    {t(`paymentMethods.${candidate}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            {method !== 'cash' && (
              <Field
                label={t('billing.collect.reference')}
                hint={t('billing.collect.referenceHint')}
                error={submitted ? referenceError : undefined}
              >
                {(control) => (
                  <Input
                    {...control}
                    value={reference}
                    onChange={(event) => {
                      setReference(event.target.value)
                    }}
                  />
                )}
              </Field>
            )}
            {failure !== null && <FormAlert>{failure}</FormAlert>}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={balance.remaining === 0}
            >
              <Wallet aria-hidden />
              {t('billing.collect.submit', { amount: amount === null ? '' : formatMoney(amount) })}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{t('billing.collect.confirmTitle')}</DialogTitle>
          <DialogDescription>
            {t('billing.collect.confirmDescription', {
              amount: formatMoney(amount ?? 0),
              name: student.full_name,
              method: t(`paymentMethods.${method}`),
            })}
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="accent"
              disabled={record.isPending}
              onClick={() => {
                if (amount === null) return
                setFailure(null)
                record
                  .mutateAsync({
                    invoiceId: invoice.id,
                    amount,
                    method,
                    reference: method === 'cash' ? null : reference.trim(),
                  })
                  .then((receipt) => {
                    setConfirming(false)
                    onDone(receipt)
                  })
                  .catch((caught: unknown) => {
                    setConfirming(false)
                    const code =
                      caught instanceof ConflictError
                        ? CONFLICTS.find((candidate) => candidate === caught.code)
                        : undefined
                    setFailure(
                      code !== undefined
                        ? t(`billing.collect.conflicts.${code}`)
                        : caught instanceof ValidationError
                          ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
                          : t('common.error'),
                    )
                  })
              }}
            >
              <CheckCircle2 aria-hidden />
              {t('billing.collect.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentCollect({
  studentId,
  invoiceId,
  onSelect,
  onDone,
  onChange,
}: {
  studentId: string
  invoiceId: string | undefined
  onSelect: (invoiceId: string) => void
  onDone: (receipt: Receipt) => void
  onChange: () => void
}) {
  const { t } = useTranslation()
  const file = useStudentFile(studentId)
  const invoices = useStudentInvoices(studentId)

  return (
    <QueryState query={file}>
      {(student) =>
        student === null ? (
          <EmptyState
            title={t('billing.collect.notFound')}
            action={
              <Button variant="outline" onClick={onChange}>
                <RotateCcw aria-hidden />
                {t('billing.collect.change')}
              </Button>
            }
          />
        ) : (
          <QueryState query={invoices}>
            {(list) => {
              const invoice = list === null ? undefined : invoiceToCollect(list, invoiceId)
              const others = (list ?? []).filter(
                (candidate) => candidate.id !== invoice?.id && candidate.balance.remaining > 0,
              )
              return invoice === undefined ? (
                <EmptyState
                  title={t('billing.collect.noInvoiceTitle', { name: student.full_name })}
                  description={t('billing.collect.noInvoiceDescription')}
                  action={
                    <Button variant="outline" onClick={onChange}>
                      <RotateCcw aria-hidden />
                      {t('billing.collect.change')}
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4">
                  {others.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/60 p-3 text-sm">
                      <span>{t('billing.collect.otherInvoices')}</span>
                      {others.map((candidate) => (
                        <Button
                          key={candidate.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onSelect(candidate.id)
                          }}
                        >
                          {t('billing.collect.otherInvoice', {
                            year: candidate.academic_year.label,
                            amount: formatMoney(candidate.balance.remaining),
                          })}
                        </Button>
                      ))}
                    </div>
                  )}
                  <PaymentForm
                    key={invoice.id}
                    student={student}
                    invoice={invoice}
                    onDone={onDone}
                    onChange={onChange}
                  />
                </div>
              )
            }}
          </QueryState>
        )
      }
    </QueryState>
  )
}

/** Encaissement au guichet (vraie API) : élève → montant → moyen → confirmation → reçu numéroté. */
export function CollectPage({
  studentId,
  invoiceId,
}: {
  studentId: string | undefined
  invoiceId?: string | undefined
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [done, setDone] = useState<Receipt | null>(null)

  const pick = (id: string | undefined, invoice?: string) => {
    setDone(null)
    void navigate({
      from: '/$school',
      to: '/$school/encaissements',
      search: { eleve: id, facture: invoice },
      replace: true,
    })
  }

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('billing.collect.title')}
        description={t('billing.collect.description')}
      />
      {done !== null ? (
        <EmptyState
          title={
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-5 text-success-ink" />
              {t('billing.collect.doneTitle')}
            </span>
          }
          description={t('billing.collect.doneDescription', {
            number: done.payment.receipt_number,
            amount: formatMoney(done.payment.amount),
          })}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="accent">
                <Link
                  from="/$school"
                  to="/$school/recus/$paymentId"
                  params={{ paymentId: done.payment.id }}
                >
                  <Printer aria-hidden />
                  {t('billing.collect.print')}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  pick(undefined)
                }}
              >
                {t('billing.collect.another')}
              </Button>
            </div>
          }
        />
      ) : studentId === undefined ? (
        <StudentPicker onPick={pick} />
      ) : (
        <StudentCollect
          key={studentId}
          studentId={studentId}
          invoiceId={invoiceId}
          onSelect={(invoice) => {
            pick(studentId, invoice)
          }}
          onDone={setDone}
          onChange={() => {
            pick(undefined)
          }}
        />
      )}
    </div>
  )
}
