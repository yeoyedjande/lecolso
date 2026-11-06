import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { useReceipt } from '@/features/billing/api'
import { ReceiptToolbar } from '@/features/billing/components/ReceiptPage'
import { ReceiptSheet } from '@/features/billing/components/ReceiptSheet'
import { receiptContent } from '@/features/billing/receipt'

/** Reçu vu par un parent : l'API ne le donne que pour un paiement d'un de ses enfants (sinon introuvable). */
export function ParentReceipt({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation()
  const query = useReceipt(paymentId)
  return (
    <div className="grid gap-4">
      <ReceiptToolbar backTo="/$school/parent/paiements" />
      <QueryState query={query}>
        {(receipt) =>
          receipt === null ? (
            <EmptyState
              headingLevel={1}
              illustration="lost"
              title={t('billing.receipt.notFound')}
            />
          ) : (
            <ReceiptSheet receipt={receiptContent(receipt)} />
          )
        }
      </QueryState>
    </div>
  )
}
