import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { PreRegistrationsPage } from '@/features/students/components/PreRegistrationsPage'

export const Route = createFileRoute('/$school/_gestion/pre-inscriptions')({
  component: () => (
    <RequirePermission permission="students.manage">
      <PreRegistrationsPage />
    </RequirePermission>
  ),
})
