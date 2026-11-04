import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'
import { MobileLayout } from '@/features/shell/MobileLayout'
import { PARENT_TABS } from '@/features/shell/nav'

export const Route = createFileRoute('/$school/parent')({
  beforeLoad: async ({ context, location, params }) =>
    guard(context.queryClient, 'parent', location.href, params.school),
  component: () => <MobileLayout space="parent" tabs={PARENT_TABS} />,
})
