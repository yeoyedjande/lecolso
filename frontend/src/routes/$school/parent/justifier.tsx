import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { JustifyPage } from '@/features/parent/components/JustifyPage'

export const Route = createFileRoute('/$school/parent/justifier')({
  validateSearch: z.object({
    eleve: z.catch(z.optional(z.string()), undefined),
    absence: z.catch(z.optional(z.string()), undefined),
  }),
  component: JustifyRoute,
})

function JustifyRoute() {
  const { eleve, absence } = Route.useSearch()
  return <JustifyPage studentId={eleve} markId={absence} />
}
