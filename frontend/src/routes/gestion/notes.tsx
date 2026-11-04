import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { GradesPage } from '@/features/grades/components/GradesPage'

export const Route = createFileRoute('/gestion/notes')({
  component: () => (
    <RequirePermission permission="grades.view">
      <GradesPage />
    </RequirePermission>
  ),
})
