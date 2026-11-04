import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { ClassesPage } from '@/features/classes/ClassesPage'

export const Route = createFileRoute('/$school/_gestion/classes')({
  component: () => (
    <RequirePermission permission="school.settings.view">
      <ClassesPage />
    </RequirePermission>
  ),
})
