import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Receipt, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MoneyAmount } from '@/components/MoneyAmount'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useMe } from '@/features/auth/api'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { parseAmount } from '@/features/billing/amount'
import { demoToday } from '@/lib/demo/dates'
import { formatDateTime, formatDay, formatMoney, formatPhone } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'
import type { DemoPayment, PaymentMethod } from '@/lib/demo/types'
import { cn } from '@/lib/utils'

import { useMyChildren, useParentPayments, usePayMobile } from '../api'
import { MOBILE_OPERATORS, type ChildCard } from '../demo'

/** Durée de la validation simulée sur le téléphone. */
const SIMULATED_WAIT_MS = import.meta.env.MODE === 'test' ? 0 : 1800

function MobileMoneyFlow({
  childList: children,
  initialChild,
  onClose,
}: {
  childList: ChildCard[]
  initialChild: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const pay = usePayMobile()
  const [studentId, setStudentId] = useState(initialChild)
  const child = children.find((candidate) => candidate.student.id === studentId) ?? children[0]
  const suggested =
    child === undefined
      ? 0
      : child.balance.overdue > 0
        ? child.balance.overdue
        : (child.balance.nextInstallment?.amount ?? 0)
  const [amountText, setAmountText] = useState(suggested > 0 ? String(suggested) : '')
  const [operator, setOperator] = useState<PaymentMethod>('orange_money')
  const [wallet, setWallet] = useState(profile?.phone ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState<'form' | 'pending' | 'done'>('form')
  const [payment, setPayment] = useState<DemoPayment | null>(null)
  const amount = parseAmount(amountText)
  const walletE164 = normalizeCiPhone(wallet)

  if (step === 'pending') {
    return (
      <div role="status" className="grid justify-items-center gap-4 py-10 text-center">
        <Loader2
          aria-hidden
          className="size-12 animate-spin text-accent-ink motion-reduce:animate-none"
        />
        <p className="font-display text-lg font-semibold">{t('parent.payments.flow.pending')}</p>
        <p className="text-sm text-muted-foreground">{t('parent.payments.flow.pendingHint')}</p>
      </div>
    )
  }

  if (step === 'done' && payment !== null) {
    return (
      <div role="status" className="grid justify-items-center gap-4 py-8 text-center">
        <CheckCircle2 aria-hidden className="size-14 text-success-ink" />
        <p className="font-display text-xl font-bold">{t('parent.payments.flow.success')}</p>
        <p className="text-sm">
          {t('parent.payments.flow.successDescription', {
            amount: formatMoney(payment.amount),
            child: child?.student.firstName ?? '',
            number: payment.receiptNumber,
          })}
        </p>
        <div className="grid w-full gap-2">
          <Button asChild size="lg">
            <Link
              from="/$school"
              to="/$school/parent/recus/$paymentId"
              params={{ paymentId: payment.id }}
            >
              <Receipt aria-hidden />
              {t('parent.payments.flow.seeReceipt')}
            </Link>
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            {t('parent.payments.flow.done')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (amount === null || walletE164 === null || child === undefined) return
        setStep('pending')
        // Validation simulée sur le téléphone, puis enregistrement du paiement
        window.setTimeout(() => {
          void pay
            .mutateAsync({ studentId: child.student.id, amount, operator, walletPhone: walletE164 })
            .then((created) => {
              setPayment(created)
              setStep('done')
            })
            .catch(() => {
              setStep('form')
            })
        }, SIMULATED_WAIT_MS)
      }}
    >
      {children.length > 1 && (
        <Field label={t('parent.payments.flow.child')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value)
              }}
            >
              {children.map((candidate) => (
                <option key={candidate.student.id} value={candidate.student.id}>
                  {candidate.student.firstName}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      <Field
        label={t('parent.payments.flow.amount')}
        error={submitted && amount === null ? t('parent.payments.flow.errors.amount') : undefined}
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
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t('parent.payments.flow.operator')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_OPERATORS.map((candidate) => (
            <label
              key={candidate}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border bg-surface px-3 text-sm font-semibold has-[:checked]:border-accent has-[:checked]:bg-orange-100 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/20"
            >
              <input
                type="radio"
                name="operator"
                className="sr-only"
                checked={operator === candidate}
                onChange={() => {
                  setOperator(candidate)
                }}
              />
              <Smartphone aria-hidden className="size-4" />
              {t(`paymentMethods.${candidate}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={t('parent.payments.flow.wallet')}
        hint={t('parent.payments.flow.walletHint')}
        error={
          submitted && walletE164 === null ? t('parent.payments.flow.errors.wallet') : undefined
        }
      >
        {(control) => (
          <Input
            {...control}
            type="tel"
            inputMode="tel"
            value={wallet.startsWith('+225') ? formatPhone(wallet) : wallet}
            onChange={(event) => {
              setWallet(event.target.value)
            }}
          />
        )}
      </Field>
      <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        {t('parent.payments.flow.simulated')}
      </p>
      <Button type="submit" variant="accent" size="lg" className="w-full">
        {t('parent.payments.flow.submit', { amount: amount === null ? '' : formatMoney(amount) })}
      </Button>
    </form>
  )
}

/** Paiements : solde par enfant, paiement Mobile Money (simulé), historique et reçus. */
export function PaymentsPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const children = useMyChildren()
  const payments = useParentPayments()
  const [paying, setPaying] = useState<string | null>(null)

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">{t('parent.payments.title')}</h1>
        <p className="text-muted-foreground">{t('parent.payments.subtitle')}</p>
      </div>
      <QueryState query={children} skeleton={<CardsSkeleton count={2} />}>
        {(list) => (
          <>
            <ul className="grid gap-3">
              {list.map((child) => (
                <li key={child.student.id}>
                  <Card>
                    <CardContent className="grid gap-3 p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-lg font-bold">
                          {child.student.firstName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {child.classroom.name}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-muted/70 p-3">
                          <p className="text-xs text-muted-foreground">
                            {t('parent.payments.remaining')}
                          </p>
                          <MoneyAmount
                            value={child.balance.remaining}
                            className="font-display text-lg font-bold"
                          />
                        </div>
                        <div className="rounded-2xl bg-muted/70 p-3">
                          <p className="text-xs text-muted-foreground">
                            {t('parent.payments.overdue')}
                          </p>
                          <MoneyAmount
                            value={child.balance.overdue}
                            className={cn(
                              'font-display text-lg font-bold',
                              child.balance.overdue > 0 && 'text-destructive-ink',
                            )}
                          />
                        </div>
                      </div>
                      {child.balance.nextInstallment !== null && (
                        <p className="text-sm text-muted-foreground">
                          {t(
                            child.balance.nextInstallment.dueDate <= demoToday()
                              ? 'parent.payments.late'
                              : 'parent.payments.next',
                            {
                              date: formatDay(child.balance.nextInstallment.dueDate),
                              amount: formatMoney(child.balance.nextInstallment.amount),
                            },
                          )}
                        </p>
                      )}
                      {can(school, 'billing.pay') && child.balance.remaining > 0 && (
                        <Button
                          variant="accent"
                          size="lg"
                          onClick={() => {
                            setPaying(child.student.id)
                          }}
                        >
                          <Smartphone aria-hidden />
                          {t('parent.payments.pay')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
            <Sheet
              open={paying !== null}
              onOpenChange={(open) => {
                if (!open) setPaying(null)
              }}
            >
              <SheetContent
                side="bottom"
                closeLabel={t('common.close')}
                className="max-h-[92dvh] overflow-y-auto p-5 pt-6"
              >
                <SheetTitle className="font-display text-xl">
                  {t('parent.payments.flow.title')}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  {t('parent.payments.subtitle')}
                </SheetDescription>
                {paying !== null && (
                  <div className="mt-4">
                    <MobileMoneyFlow
                      childList={list}
                      initialChild={paying}
                      onClose={() => {
                        setPaying(null)
                      }}
                    />
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}
      </QueryState>

      <section aria-labelledby="history-title" className="grid gap-3">
        <h2 id="history-title" className="font-display text-lg font-semibold">
          {t('parent.payments.history')}
        </h2>
        <QueryState query={payments}>
          {(list) =>
            list.length === 0 ? (
              <EmptyState title={t('parent.payments.noPayment')} />
            ) : (
              <ul className="grid gap-2">
                {list.map((payment) => (
                  <li key={payment.id}>
                    <Link
                      from="/$school"
                      to="/$school/parent/recus/$paymentId"
                      params={{ paymentId: payment.id }}
                      className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
                    >
                      <span className="grid flex-1">
                        <span className="font-medium">
                          {payment.childName.split(' ').slice(1).join(' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(payment.paidAt)} · {t(`paymentMethods.${payment.method}`)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('parent.payments.receipt', { number: payment.receiptNumber })}
                        </span>
                      </span>
                      <MoneyAmount value={payment.amount} className="font-semibold" />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </section>
    </div>
  )
}
