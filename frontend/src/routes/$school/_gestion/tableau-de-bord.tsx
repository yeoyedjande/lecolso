import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '@/features/dashboard/DashboardPage'

export const Route = createFileRoute('/$school/_gestion/tableau-de-bord')({
  component: DashboardPage,
})
