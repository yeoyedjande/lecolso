import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { ImportPage } from '@/features/students/components/ImportPage'

export const Route = createFileRoute('/gestion/import')({
  component: () => (
    <RequirePermission permission="students.manage">
      <ImportPage />
    </RequirePermission>
  ),
})
