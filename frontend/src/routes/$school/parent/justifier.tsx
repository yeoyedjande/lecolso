import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { JustifyPage } from '@/features/parent/components/JustifyPage'

export const Route = createFileRoute('/$school/parent/justifier')({
  validateSearch: z.object({
    eleve: z.catch(z.optional(z.string()), undefined),
    date: z.catch(z.optional(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))), undefined),
  }),
  component: JustifyRoute,
})

function JustifyRoute() {
  const { eleve, date } = Route.useSearch()
  return <JustifyPage studentId={eleve} date={date} />
}
