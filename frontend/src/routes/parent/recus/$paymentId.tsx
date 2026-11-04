import { createFileRoute } from '@tanstack/react-router'

import { ParentReceipt } from '@/features/parent/components/ParentReceipt'

export const Route = createFileRoute('/parent/recus/$paymentId')({
  component: ReceiptRoute,
})

function ReceiptRoute() {
  const { paymentId } = Route.useParams()
  return <ParentReceipt paymentId={paymentId} />
}
