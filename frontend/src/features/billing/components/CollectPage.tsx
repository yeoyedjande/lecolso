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
import { useMe } from '@/features/auth/api'
import { useStudent, useStudents } from '@/features/students/api'
import type { StudentDetail } from '@/features/students/demo'
import { formatDay, formatMoney } from '@/lib/format'
import type { DemoPayment, PaymentMethod } from '@/lib/demo/types'
import { cn } from '@/lib/utils'

import { parseAmount } from '../amount'
import { useRecordPayment } from '../api'

const METHODS: PaymentMethod[] = [
  'cash',
  'orange_money',
  'mtn_momo',
  'moov_money',
  'wave',
  'cheque',
  'transfer',
]

function StudentPicker({ onPick }: { onPick: (id: string) => void }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const results = useStudents({ search: deferred })

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
      {deferred.trim().length >= 2 && (
        <QueryState query={results}>
          {(rows) =>
            rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('billing.collect.noResult')}</p>
            ) : (
              <ul className="grid gap-2">
                {rows.slice(0, 6).map((row) => (
                  <li key={row.student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(row.student.id)
                      }}
                      aria-label={t('billing.collect.pick', { name: row.name })}
                      className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-accent"
                    >
                      <Avatar name={row.name} size="sm" />
                      <span className="grid flex-1">
                        <span className="font-semibold">{row.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.student.matricule} · {row.payer}
                        </span>
                      </span>
                      <CycleBadge code={row.classroom.cycle} label={row.classroom.name} />
                    </button>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      )}
    </div>
  )
}

function PaymentForm({
  detail,
  onDone,
  onChange,
}: {
  detail: StudentDetail
  onDone: (payment: DemoPayment) => void
  onChange: () => void
}) {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const record = useRecordPayment()
  const { balance } = detail
  const [amountText, setAmountText] = useState(balance.overdue > 0 ? String(balance.overdue) : '')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const amount = parseAmount(amountText)
  const amountError =
    amount === null
      ? t('billing.collect.errors.amount')
      : amount > balance.remaining && balance.remaining > 0
        ? t('billing.collect.errors.tooMuch', { amount: formatMoney(balance.remaining) })
        : undefined
  const referenceError =
    method !== 'cash' && reference.trim() === '' ? t('billing.collect.errors.reference') : undefined
  const suggestions = [
    ['suggestOverdue', balance.overdue],
    ['suggestNext', balance.nextInstallment === null ? 0 : balance.nextInstallment.amount],
    ['suggestAll', balance.remaining],
  ] as const

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar name={detail.name} size="lg" />
            <div className="grid gap-1">
              <p className="font-display text-xl font-bold">{detail.name}</p>
              <CycleBadge
                code={detail.classroom.cycle}
                label={detail.classroom.name}
                className="w-fit"
              />
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
            {balance.nextInstallment !== null
              ? t('billing.collect.next', {
                  label: balance.nextInstallment.label,
                  amount: formatMoney(balance.nextInstallment.amount),
                  date: formatDay(balance.nextInstallment.dueDate),
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
                {METHODS.map((candidate) => (
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
            <Button type="submit" variant="accent" size="lg" className="w-full">
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
              name: detail.name,
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
                void record
                  .mutateAsync({
                    studentId: detail.student.id,
                    amount,
                    method,
                    reference: method === 'cash' ? null : reference.trim(),
                    cashier: profile?.name ?? '',
                  })
                  .then((payment) => {
                    setConfirming(false)
                    onDone(payment)
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

/** Encaissement au guichet : élève → montant → moyen → confirmation → reçu. */
export function CollectPage({ studentId }: { studentId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [done, setDone] = useState<DemoPayment | null>(null)
  const detail = useStudent(studentId ?? '')

  const pick = (id: string | undefined) => {
    setDone(null)
    void navigate({
      from: '/$school',
      to: '/$school/encaissements',
      search: { eleve: id },
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
            number: done.receiptNumber,
            amount: formatMoney(done.amount),
          })}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="accent">
                <Link
                  from="/$school"
                  to="/$school/recus/$paymentId"
                  params={{ paymentId: done.id }}
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
        <QueryState query={detail}>
          {(data) =>
            data === null ? (
              <StudentPicker onPick={pick} />
            ) : (
              <PaymentForm
                key={data.student.id}
                detail={data}
                onDone={setDone}
                onChange={() => {
                  pick(undefined)
                }}
              />
            )
          }
        </QueryState>
      )}
    </div>
  )
}
