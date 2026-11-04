import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'
import { PlatformLayout } from '@/features/platform/components/PlatformLayout'

export const Route = createFileRoute('/plateforme')({
  beforeLoad: async ({ context, location }) =>
    guard(context.queryClient, 'platform', location.href),
  component: PlatformLayout,
})
