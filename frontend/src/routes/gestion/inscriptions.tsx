import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { EnrollmentWizard } from '@/features/students/components/EnrollmentWizard'

export const Route = createFileRoute('/gestion/inscriptions')({
  component: () => (
    <RequirePermission permission="students.manage">
      <EnrollmentWizard />
    </RequirePermission>
  ),
})
