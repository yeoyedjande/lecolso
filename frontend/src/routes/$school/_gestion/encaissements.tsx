import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { CollectPage } from '@/features/billing/components/CollectPage'

export const Route = createFileRoute('/$school/_gestion/encaissements')({
  validateSearch: z.object({ eleve: z.catch(z.optional(z.string()), undefined) }),
  component: CollectRoute,
})

function CollectRoute() {
  const { eleve } = Route.useSearch()
  return (
    <RequirePermission permission="billing.manage">
      <CollectPage studentId={eleve} />
    </RequirePermission>
  )
}
