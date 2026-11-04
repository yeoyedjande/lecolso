import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { SchedulesPage } from '@/features/billing/components/SchedulesPage'

export const Route = createFileRoute('/$school/_gestion/echeanciers')({
  component: () => (
    <RequirePermission permission="billing.view">
      <SchedulesPage />
    </RequirePermission>
  ),
})
