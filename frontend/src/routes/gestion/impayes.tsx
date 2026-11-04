import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { UnpaidPage } from '@/features/billing/components/UnpaidPage'

export const Route = createFileRoute('/gestion/impayes')({
  component: () => (
    <RequirePermission permission="billing.view">
      <UnpaidPage />
    </RequirePermission>
  ),
})
