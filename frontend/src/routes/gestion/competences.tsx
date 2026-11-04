import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { SkillsPage } from '@/features/grades/components/SkillsPage'

export const Route = createFileRoute('/gestion/competences')({
  component: () => (
    <RequirePermission permission="grades.view">
      <SkillsPage />
    </RequirePermission>
  ),
})
