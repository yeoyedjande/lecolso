import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'
import { MobileLayout } from '@/features/shell/MobileLayout'
import { TEACHER_TABS } from '@/features/shell/nav'

export const Route = createFileRoute('/enseignant')({
  beforeLoad: async ({ context, location }) =>
    guard(context.queryClient, 'enseignant', location.href),
  component: () => <MobileLayout space="enseignant" tabs={TEACHER_TABS} />,
})
