import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { AttendancePage } from '@/features/attendance/components/AttendancePage'

export const Route = createFileRoute('/$school/_gestion/presences')({
  component: () => (
    <RequirePermission permission="attendance.view">
      <AttendancePage />
    </RequirePermission>
  ),
})
