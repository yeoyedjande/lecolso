import { Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LogoMark } from '@/components/brand/Logo'
import { MoneyAmount } from '@/components/MoneyAmount'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { amountInWords } from '@/lib/amountInWords'
import { formatDateTime, formatPhone } from '@/lib/format'

import { useReceipt } from '../api'

/** Reçu imprimable (format A5 portrait à l'impression ; le menu et l'en-tête sont masqués). */
export function ReceiptPage({
  paymentId,
  backTo = '/gestion/caisse',
}: {
  paymentId: string
  backTo?: '/gestion/caisse' | '/parent/paiements'
}) {
  const { t } = useTranslation()
  const query = useReceipt(paymentId)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to={backTo}>
            <ArrowLeft aria-hidden />
            {t('billing.receipt.back')}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <DemoBanner />
          <Button
            variant="accent"
            onClick={() => {
              window.print()
            }}
          >
            <Printer aria-hidden />
            {t('common.print')}
          </Button>
        </div>
      </div>
      <QueryState query={query}>
        {(receipt) =>
          receipt === null ? (
            <EmptyState
              headingLevel={1}
              illustration="lost"
              title={t('billing.receipt.notFound')}
            />
          ) : (
            <article className="mx-auto w-full max-w-2xl rounded-3xl border bg-white p-6 text-navy shadow-soft sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
              <header className="flex items-start justify-between gap-4 border-b-2 border-navy pb-5">
                <div className="flex items-center gap-3">
                  <LogoMark className="size-12" />
                  <div>
                    <p className="font-display text-xl font-bold">{receipt.school.name}</p>
                    <p className="text-sm text-warm-600">{receipt.school.address}</p>
                    <p className="text-sm text-warm-600">{formatPhone(receipt.school.phone)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="font-display text-lg font-bold tracking-wide uppercase">
                    {t('billing.receipt.title')}
                  </h1>
                  <p className="tabular font-semibold text-[#a14a07]">
                    {t('billing.receipt.number', { number: receipt.payment.receiptNumber })}
                  </p>
                  <p className="text-sm text-warm-600">{receipt.school.year}</p>
                </div>
              </header>

              <dl className="grid gap-x-6 gap-y-3 py-6 sm:grid-cols-2">
                {(
                  [
                    ['date', formatDateTime(receipt.payment.paidAt)],
                    ['payer', receipt.payer],
                    ['student', receipt.studentName],
                    ['matricule', receipt.matricule],
                    ['classroom', receipt.classroom],
                    ['method', t(`paymentMethods.${receipt.payment.method}`)],
                    ...(receipt.payment.reference !== null
                      ? [['reference', receipt.payment.reference] as const]
                      : []),
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="grid gap-0.5">
                    <dt className="text-xs font-semibold tracking-wide text-warm-600 uppercase">
                      {t(`billing.receipt.${key}`)}
                    </dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="grid gap-2 rounded-2xl bg-cream p-5 print:border print:border-warm-300">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold">{t('billing.receipt.amount')}</span>
                  <MoneyAmount
                    value={receipt.payment.amount}
                    className="font-display text-3xl font-bold"
                  />
                </div>
                <p className="text-sm italic">
                  {t('billing.receipt.inWords', { words: amountInWords(receipt.payment.amount) })}
                </p>
              </div>

              <div className="flex items-baseline justify-between gap-4 py-4 text-sm">
                <span className="text-warm-600">{t('billing.receipt.remaining')}</span>
                <MoneyAmount value={receipt.remaining} className="font-semibold" />
              </div>

              <footer className="grid gap-8 border-t pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-warm-600 uppercase">
                    {t('billing.receipt.cashier')}
                  </p>
                  <p className="font-medium">{receipt.payment.cashier}</p>
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
      </QueryState>
    </div>
  )
}
