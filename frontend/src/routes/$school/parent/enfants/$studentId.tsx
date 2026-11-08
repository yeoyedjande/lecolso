import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { ChildPage } from '@/features/parent/components/ChildPage'
import { CHILD_TABS } from '@/features/parent/tabs'

export const Route = createFileRoute('/$school/parent/enfants/$studentId')({
  validateSearch: z.object({
    onglet: z.catch(z.optional(z.enum(CHILD_TABS)), undefined),
  }),
  component: ChildRoute,
})

function ChildRoute() {
  const { studentId } = Route.useParams()
  const { onglet } = Route.useSearch()
  return <ChildPage studentId={studentId} tab={onglet} />
}
