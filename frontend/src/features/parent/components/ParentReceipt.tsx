import { useTranslation } from 'react-i18next'

import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { useDemoReceipt } from '@/features/billing/api'
import { ReceiptToolbar } from '@/features/billing/components/ReceiptPage'
import { ReceiptSheet } from '@/features/billing/components/ReceiptSheet'

import { useParentPayments } from '../api'

function DemoReceipt({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation()
  const query = useDemoReceipt(paymentId)
  return (
    <QueryState query={query}>
      {(receipt) =>
        receipt === null ? (
          <EmptyState headingLevel={1} illustration="lost" title={t('billing.receipt.notFound')} />
        ) : (
          <ReceiptSheet
            receipt={{
              number: receipt.payment.receiptNumber,
              paidAt: receipt.payment.paidAt,
              amount: receipt.payment.amount,
              method: receipt.payment.method,
              reference: receipt.payment.reference,
              payer: receipt.payer,
              studentName: receipt.studentName,
              matricule: receipt.matricule,
              classroom: receipt.classroom,
              yearLabel: receipt.school.year,
              remaining: receipt.remaining,
              cashier: receipt.payment.cashier,
              school: {
                name: receipt.school.name,
                address: receipt.school.address,
                phone: receipt.school.phone,
                logoUrl: null,
              },
              cancellation: null,
            }}
          />
        )
      }
    </QueryState>
  )
}

/** Reçu vu par un parent : seulement pour un paiement d'un de ses enfants (démonstration). */
export function ParentReceipt({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation()
  const payments = useParentPayments()
  return (
    <div className="grid gap-4">
      <ReceiptToolbar backTo="/$school/parent/paiements">
        <DemoBanner />
      </ReceiptToolbar>
      <QueryState query={payments}>
        {(list) =>
          list.some((payment) => payment.id === paymentId) ? (
            <DemoReceipt paymentId={paymentId} />
          ) : (
            <EmptyState
              headingLevel={1}
              illustration="lost"
              title={t('billing.receipt.notFound')}
            />
          )
        }
      </QueryState>
    </div>
  )
}
