import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { ReceiptPage } from '@/features/billing/components/ReceiptPage'

export const Route = createFileRoute('/$school/_gestion/recus/$paymentId')({
  component: ReceiptRoute,
})

function ReceiptRoute() {
  const { paymentId } = Route.useParams()
  return (
    <RequirePermission permission="billing.view">
      <ReceiptPage paymentId={paymentId} />
    </RequirePermission>
  )
}
