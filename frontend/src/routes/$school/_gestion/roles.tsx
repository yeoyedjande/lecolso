import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { RolesPage } from '@/features/roles/components/RolesPage'

export const Route = createFileRoute('/$school/_gestion/roles')({
  component: () => (
    <RequirePermission permission="roles.manage">
      <RolesPage />
    </RequirePermission>
  ),
})
