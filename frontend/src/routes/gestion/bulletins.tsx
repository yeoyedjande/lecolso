import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { ReportCardsPage } from '@/features/grades/components/ReportCardsPage'

export const Route = createFileRoute('/gestion/bulletins')({
  component: () => (
    <RequirePermission permission="grades.view">
      <ReportCardsPage />
    </RequirePermission>
  ),
})
