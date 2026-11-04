import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { FeesPage } from '@/features/billing/components/FeesPage'

export const Route = createFileRoute('/$school/_gestion/frais')({
  component: () => (
    <RequirePermission permission="billing.view">
      <FeesPage />
    </RequirePermission>
  ),
})
