import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'
import { BackOfficeLayout } from '@/features/shell/BackOfficeLayout'

export const Route = createFileRoute('/gestion')({
  beforeLoad: async ({ context, location }) => guard(context.queryClient, 'gestion', location.href),
  component: BackOfficeLayout,
})
