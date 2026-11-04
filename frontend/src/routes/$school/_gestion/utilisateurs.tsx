import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { UsersPage } from '@/features/users/components/UsersPage'

export const Route = createFileRoute('/$school/_gestion/utilisateurs')({
  component: () => (
    <RequirePermission permission={['users.view', 'users.reset_password']}>
      <UsersPage />
    </RequirePermission>
  ),
})
