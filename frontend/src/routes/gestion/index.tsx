import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '@/features/dashboard/DashboardPage'

export const Route = createFileRoute('/gestion/')({
  component: DashboardPage,
})
