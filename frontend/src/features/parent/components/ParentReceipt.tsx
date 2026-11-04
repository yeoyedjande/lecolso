import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { ReceiptPage } from '@/features/billing/components/ReceiptPage'

import { useParentPayments } from '../api'

/** Reçu vu par un parent : seulement pour un paiement d'un de ses enfants. */
export function ParentReceipt({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation()
  const payments = useParentPayments()
  return (
    <QueryState query={payments}>
      {(list) =>
        list.some((payment) => payment.id === paymentId) ? (
          <ReceiptPage paymentId={paymentId} backTo="/$school/parent/paiements" />
        ) : (
          <EmptyState headingLevel={1} illustration="lost" title={t('billing.receipt.notFound')} />
        )
      }
    </QueryState>
  )
}
