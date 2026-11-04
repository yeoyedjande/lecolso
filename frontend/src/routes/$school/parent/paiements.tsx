import { createFileRoute } from '@tanstack/react-router'

import { PaymentsPage } from '@/features/parent/components/PaymentsPage'

export const Route = createFileRoute('/$school/parent/paiements')({
  component: PaymentsPage,
})
