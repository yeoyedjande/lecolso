import { createFileRoute } from '@tanstack/react-router'

import { SchoolsListPage } from '@/features/platform/components/SchoolsListPage'

export const Route = createFileRoute('/plateforme/')({
  component: SchoolsListPage,
})
