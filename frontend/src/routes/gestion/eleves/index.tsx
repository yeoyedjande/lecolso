import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { StudentsPage } from '@/features/students/components/StudentsPage'

export const Route = createFileRoute('/gestion/eleves/')({
  validateSearch: z.object({
    q: z.catch(z.optional(z.string()), undefined),
    cycle: z.catch(z.optional(z.enum(['daycare', 'kindergarten', 'primary'])), undefined),
    classe: z.catch(z.optional(z.string()), undefined),
  }),
  component: StudentsRoute,
})

function StudentsRoute() {
  const search = Route.useSearch()
  return (
    <RequirePermission permission="students.view">
      <StudentsPage search={search} />
    </RequirePermission>
  )
}
