import { useTranslation } from 'react-i18next'

import { LogoMark } from '@/components/brand/Logo'
import { MoneyAmount } from '@/components/MoneyAmount'
import { SchoolLogo } from '@/features/school/components/SchoolLogo'
import { amountInWords } from '@/lib/amountInWords'
import { formatDateTime, formatPhone } from '@/lib/format'

import type { PaymentMethod } from '../api'

/** Contenu d'un reçu, quelle que soit sa source (vraie API au guichet, démonstration dans l'espace parent). */
export interface ReceiptContent {
  number: string
  paidAt: string
  amount: number
  method: PaymentMethod
  reference: string | null
  payer: string
  studentName: string
  matricule: string
  classroom: string
  yearLabel: string
  remaining: number
  cashier: string
  school: { name: string; address: string | null; phone: string | null; logoUrl: string | null }
  cancellation: { reason: string; at: string; by: string } | null
}

/** Reçu imprimable (format A5 portrait à l'impression ; le menu et l'en-tête sont masqués). */
export function ReceiptSheet({ receipt }: { receipt: ReceiptContent }) {
  const { t } = useTranslation()
  const rows: [string, string][] = [
    [t('billing.receipt.date'), formatDateTime(receipt.paidAt)],
    [t('billing.receipt.payer'), receipt.payer],
    [t('billing.receipt.student'), receipt.studentName],
    [t('billing.receipt.matricule'), receipt.matricule],
    [t('billing.receipt.classroom'), receipt.classroom],
    [t('billing.receipt.method'), t(`paymentMethods.${receipt.method}`)],
    ...(receipt.reference === null
      ? []
      : [[t('billing.receipt.reference'), receipt.reference] satisfies [string, string]]),
  ]

  return (
    <article className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border bg-white p-6 text-navy shadow-soft sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {receipt.cancellation !== null && (
        <div
          role="status"
          className="mb-5 rounded-2xl border-2 border-[#b42318] bg-[#fef3f2] p-4 text-[#7a1a12]"
        >
          <p className="font-display text-lg font-bold tracking-wide uppercase">
            {t('billing.receipt.cancelled')}
          </p>
          <p className="text-sm">
            {t('billing.receipt.cancelledDetail', {
              date: formatDateTime(receipt.cancellation.at),
              name: receipt.cancellation.by,
              reason: receipt.cancellation.reason,
            })}
          </p>
        </div>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-navy pb-5">
        <div className="flex min-w-0 items-center gap-3">
          {receipt.school.logoUrl === null ? (
            <LogoMark className="size-12 shrink-0" />
          ) : (
            <SchoolLogo
              url={receipt.school.logoUrl}
              name={receipt.school.name}
              className="size-12 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-display text-xl font-bold">{receipt.school.name}</p>
            {receipt.school.address !== null && (
              <p className="text-sm text-warm-600">{receipt.school.address}</p>
            )}
            {receipt.school.phone !== null && (
              <p className="text-sm text-warm-600">{formatPhone(receipt.school.phone)}</p>
            )}
          </div>
        </div>
        <div className="sm:text-right">
          <h1 className="font-display text-lg font-bold tracking-wide uppercase">
            {t('billing.receipt.title')}
          </h1>
          <p className="tabular font-semibold text-[#a14a07]">
            {t('billing.receipt.number', { number: receipt.number })}
          </p>
          <p className="text-sm text-warm-600">{receipt.yearLabel}</p>
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-3 py-6 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-xs font-semibold tracking-wide text-warm-600 uppercase">{label}</dt>
            <dd className="font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2 rounded-2xl bg-cream p-5 print:border print:border-warm-300">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <span className="font-semibold">{t('billing.receipt.amount')}</span>
          <MoneyAmount
            value={receipt.amount}
            className={
              receipt.cancellation === null
                ? 'font-display text-3xl font-bold'
                : 'font-display text-3xl font-bold line-through'
            }
          />
        </div>
        <p className="text-sm italic">
          {t('billing.receipt.inWords', { words: amountInWords(receipt.amount) })}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-4 py-4 text-sm">
        <span className="text-warm-600">{t('billing.receipt.remaining')}</span>
        <MoneyAmount value={receipt.remaining} className="font-semibold" />
      </div>

      <footer className="grid gap-8 border-t pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-warm-600 uppercase">
            {t('billing.receipt.cashier')}
          </p>
          <p className="font-medium">{receipt.cashier}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold tracking-wide text-warm-600 uppercase">
            {t('billing.receipt.signature')}
          </p>
          <div className="mt-2 h-16 rounded-xl border border-dashed border-warm-300" />
        </div>
        <p className="text-center text-xs text-warm-600 sm:col-span-2">
          {t('billing.receipt.footer')}
        </p>
      </footer>
    </article>
  )
}
