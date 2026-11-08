import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'
import { PlatformLayout } from '@/features/platform/components/PlatformLayout'

export const Route = createFileRoute('/plateforme')({
  beforeLoad: async ({ context, location, preload }) =>
    guard(context.queryClient, 'platform', location.href, null, preload),
  component: PlatformLayout,
})
