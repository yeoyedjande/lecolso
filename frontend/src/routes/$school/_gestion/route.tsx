import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'
import { BackOfficeLayout } from '@/features/shell/BackOfficeLayout'

export const Route = createFileRoute('/$school/_gestion')({
  beforeLoad: async ({ context, location, params, preload }) =>
    guard(context.queryClient, 'gestion', location.href, params.school, preload),
  component: BackOfficeLayout,
})
