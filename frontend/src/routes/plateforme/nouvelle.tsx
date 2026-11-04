import { createFileRoute } from '@tanstack/react-router'

import { CreateSchoolPage } from '@/features/platform/components/CreateSchoolPage'

export const Route = createFileRoute('/plateforme/nouvelle')({
  component: CreateSchoolPage,
})
