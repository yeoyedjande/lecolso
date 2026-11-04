import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { StudentDetailPage } from '@/features/students/components/StudentDetailPage'

export const Route = createFileRoute('/$school/_gestion/eleves/$studentId')({
  component: StudentRoute,
})

function StudentRoute() {
  const { studentId } = Route.useParams()
  return (
    <RequirePermission permission="students.view">
      <StudentDetailPage studentId={studentId} />
    </RequirePermission>
  )
}
