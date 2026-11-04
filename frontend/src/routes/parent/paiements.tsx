import { createFileRoute } from '@tanstack/react-router'

import { PaymentsPage } from '@/features/parent/components/PaymentsPage'

export const Route = createFileRoute('/parent/paiements')({
  component: PaymentsPage,
})
