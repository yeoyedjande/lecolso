import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Receipt, Smartphone, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMe } from '@/features/auth/api'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

import {
  MOBILE_MONEY_METHODS,
  mobileMoneyCharge,
  useChild,
  usePayForChild,
  usePaymentIntent,
  type MobileMoneyMethod,
} from '../api'

/** Numéro national à 10 chiffres pour la saisie (« +2250701020304 » → « 0701020304 »). */
function nationalNumber(e164: string | undefined): string {
  return e164?.startsWith('+225') === true ? e164.slice(4) : ''
}

function Choice({
  checked,
  onChange,
  name,
  children,
}: {
  checked: boolean
  onChange: () => void
  name: string
  children: React.ReactNode
}) {
  return (
    <label
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-xl border bg-card px-3 text-sm',
        checked && 'border-accent ring-2 ring-accent/20',
      )}
    >
      <input
        type="radio"
        name={name}
        className="size-4 accent-[var(--color-accent)]"
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  )
}

/** Suivi d'une demande : validation sur le téléphone, puis réussite (reçu) ou échec (nouvel essai). */
function Progress({ intentId, onRetry }: { intentId: string; onRetry: () => void }) {
  const { t } = useTranslation()
  const intent = usePaymentIntent(intentId).data

  if (intent === undefined || intent.status === 'pending') {
    return (
      <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
        <Loader2 aria-hidden className="size-10 animate-spin text-accent-ink" />
        <p className="font-display text-lg font-semibold">{t('parent.payments.flow.pending')}</p>
        <p className="text-sm text-muted-foreground">
          {t('parent.payments.flow.pendingHint', { phone: intent?.phone ?? '' })}
        </p>
      </div>
    )
  }
  if (intent.status === 'succeeded') {
    return (
      <div className="grid justify-items-center gap-3 py-4 text-center" role="status">
        <CheckCircle2 aria-hidden className="size-12 text-success-ink" />
        <p className="font-display text-xl font-bold">{t('parent.payments.flow.success')}</p>
        <p className="text-sm">
          {t('parent.payments.flow.successDescription', {
            amount: formatMoney(intent.amount),
            number: intent.receipt_number ?? '',
          })}
        </p>
        {intent.payment_id !== null && (
          <Button asChild variant="accent" size="lg">
            <Link
              from="/$school"
              to="/$school/parent/recus/$paymentId"
              params={{ paymentId: intent.payment_id }}
            >
              <Receipt aria-hidden />
              {t('parent.payments.flow.seeReceipt')}
            </Link>
          </Button>
        )}
      </div>
    )
  }
  return (
    <div className="grid justify-items-center gap-3 py-4 text-center" role="alert">
      <XCircle aria-hidden className="size-12 text-destructive-ink" />
      <p className="font-display text-lg font-semibold">
        {intent.status === 'expired'
          ? t('parent.payments.flow.expired')
          : t('parent.payments.flow.failed')}
      </p>
      {intent.failure_reason !== null && (
        <p className="text-sm text-muted-foreground">{intent.failure_reason}</p>
      )}
      <Button variant="outline" onClick={onRetry}>
        {t('parent.payments.flow.retry')}
      </Button>
    </div>
  )
}

/**
 * Paiement Mobile Money d'un enfant (3 étapes au plus) : montant proposé ou libre (au plus le reste dû), opérateur et
 * numéro, puis validation sur le téléphone et reçu.
 */
export function MobileMoneyDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const child = useChild(open ? studentId : '').data
  const { data: profile } = useMe()
  const pay = usePayForChild()
  const [choice, setChoice] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [method, setMethod] = useState<MobileMoneyMethod>('orange_money')
  const [phone, setPhone] = useState<string | null>(null)
  const [intentId, setIntentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const balance = child?.balance ?? null
  const proposals = [
    ...(balance?.next !== null && balance?.next !== undefined
      ? [
          {
            key: 'next',
            amount: balance.next.amount,
            label: t('parent.payments.flow.next', { label: balance.next.label }),
          },
        ]
      : []),
    ...(balance !== null && balance.overdue > 0
      ? [{ key: 'overdue', amount: balance.overdue, label: t('parent.payments.flow.overdue') }]
      : []),
    ...(balance !== null && balance.remaining > 0
      ? [
          {
            key: 'remaining',
            amount: balance.remaining,
            label: t('parent.payments.flow.remaining'),
          },
        ]
      : []),
  ].filter(
    (proposal, index, all) => all.findIndex((other) => other.amount === proposal.amount) === index,
  )
  const selected = choice === '' ? (proposals[0]?.key ?? 'custom') : choice
  const amount =
    selected === 'custom'
      ? /^\d+$/.test(custom.trim())
        ? Number(custom.trim())
        : null
      : (proposals.find((proposal) => proposal.key === selected)?.amount ?? null)
  const wallet = phone ?? nationalNumber(profile?.phone)
  const walletE164 = normalizeCiPhone(wallet)
  const tooMuch = amount !== null && balance !== null && amount > balance.remaining
  const charge =
    amount === null || child === undefined || child === null
      ? null
      : mobileMoneyCharge(amount, child.mobile_money)

  const close = (value: boolean) => {
    onOpenChange(value)
    if (!value) {
      setIntentId(null)
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle>{t('parent.payments.flow.title')}</DialogTitle>
        <DialogDescription>{child?.student.full_name ?? ''}</DialogDescription>
        {child !== undefined && child !== null && !child.mobile_money.available ? (
          <p className="rounded-xl bg-muted p-3 text-sm" role="note">
            {t('parent.payments.soon')}
          </p>
        ) : intentId !== null ? (
          <Progress
            intentId={intentId}
            onRetry={() => {
              setIntentId(null)
            }}
          />
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (amount === null || walletE164 === null || tooMuch) return
              setError(null)
              pay
                .mutateAsync({ studentId, amount, method, phone: walletE164 })
                .then((intent) => {
                  setIntentId(intent.id)
                })
                .catch((caught: unknown) => {
                  setError(
                    caught instanceof ConflictError
                      ? caught.message
                      : caught instanceof ValidationError
                        ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
                        : t('common.error'),
                  )
                })
            }}
          >
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">
                {t('parent.payments.flow.amountTitle')}
              </legend>
              {proposals.map((proposal) => (
                <Choice
                  key={proposal.key}
                  name="amount"
                  checked={selected === proposal.key}
                  onChange={() => {
                    setChoice(proposal.key)
                  }}
                >
                  <span className="flex flex-1 items-center justify-between gap-2">
                    <span>{proposal.label}</span>
                    <span className="font-semibold">{formatMoney(proposal.amount)}</span>
                  </span>
                </Choice>
              ))}
              <Choice
                name="amount"
                checked={selected === 'custom'}
                onChange={() => {
                  setChoice('custom')
                }}
              >
                {t('parent.payments.flow.custom')}
              </Choice>
            </fieldset>
            {selected === 'custom' && (
              <Field
                label={t('parent.payments.flow.amount')}
                error={tooMuch ? t('parent.payments.flow.errors.tooMuch') : undefined}
              >
                {(control) => (
                  <Input
                    {...control}
                    inputMode="numeric"
                    value={custom}
                    onChange={(event) => {
                      setCustom(event.target.value)
                    }}
                  />
                )}
              </Field>
            )}
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="mb-1 text-sm font-medium">
                {t('parent.payments.flow.operator')}
              </legend>
              {MOBILE_MONEY_METHODS.map((candidate) => (
                <Choice
                  key={candidate}
                  name="operator"
                  checked={method === candidate}
                  onChange={() => {
                    setMethod(candidate)
                  }}
                >
                  {t(`paymentMethods.${candidate}`)}
                </Choice>
              ))}
            </fieldset>
            <Field
              label={t('parent.payments.flow.wallet')}
              hint={t('parent.payments.flow.walletHint')}
              error={
                wallet !== '' && walletE164 === null
                  ? t('parent.payments.flow.errors.wallet')
                  : undefined
              }
            >
              {(control) => (
                <Input
                  {...control}
                  type="tel"
                  inputMode="tel"
                  value={wallet}
                  onChange={(event) => {
                    setPhone(event.target.value)
                  }}
                />
              )}
            </Field>
            {charge !== null && charge.fee > 0 && (
              <p className="rounded-xl bg-muted p-3 text-sm" role="note">
                {child?.mobile_money.fee_payer === 'guardian'
                  ? t('parent.payments.flow.feeGuardian', {
                      fee: formatMoney(charge.fee),
                      charged: formatMoney(charge.charged),
                    })
                  : t('parent.payments.flow.feeSchool')}
              </p>
            )}
            {error !== null && (
              <p className="text-sm text-destructive-ink" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              variant="accent"
              disabled={
                amount === null || amount < 100 || walletE164 === null || tooMuch || pay.isPending
              }
            >
              <Smartphone aria-hidden />
              {t('parent.payments.flow.submit', {
                amount: charge === null ? '' : formatMoney(charge.charged),
              })}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
