import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { PlanAbsencePage } from '@/features/parent/components/PlanAbsencePage'

export const Route = createFileRoute('/$school/parent/prevenir')({
  validateSearch: z.object({
    eleve: z.catch(z.optional(z.string()), undefined),
  }),
  component: PlanAbsenceRoute,
})

function PlanAbsenceRoute() {
  const { eleve } = Route.useSearch()
  return <PlanAbsencePage studentId={eleve} />
}
