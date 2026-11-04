import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { DaycarePage } from '@/features/attendance/components/DaycarePage'

export const Route = createFileRoute('/gestion/garderie')({
  component: () => (
    <RequirePermission permission="attendance.view">
      <DaycarePage />
    </RequirePermission>
  ),
})
