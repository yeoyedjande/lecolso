import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { EnrollmentWizard } from '@/features/students/components/EnrollmentWizard'

// `?preinscription=<id>` : inscription pré-remplie depuis une pré-inscription reçue en ligne
const search = z.object({ preinscription: z.optional(z.string().check(z.uuid())) })

export const Route = createFileRoute('/$school/_gestion/inscriptions')({
  validateSearch: (input) => {
    const parsed = search.safeParse(input)
    return parsed.success ? parsed.data : {}
  },
  component: function EnrollmentRoute() {
    const { preinscription } = Route.useSearch()
    return (
      <RequirePermission permission="students.manage">
        <EnrollmentWizard preRegistrationId={preinscription ?? null} />
      </RequirePermission>
    )
  },
})
