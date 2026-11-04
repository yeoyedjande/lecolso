import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { CashDeskPage } from '@/features/billing/components/CashDeskPage'

export const Route = createFileRoute('/$school/_gestion/caisse')({
  component: () => (
    <RequirePermission permission="billing.view">
      <CashDeskPage />
    </RequirePermission>
  ),
})
