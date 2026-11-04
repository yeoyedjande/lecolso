import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { SettingsPage } from '@/features/settings/components/SettingsPage'

export const Route = createFileRoute('/gestion/parametres')({
  component: () => (
    <RequirePermission permission="school.settings.view">
      <SettingsPage />
    </RequirePermission>
  ),
})
