import { createFileRoute } from '@tanstack/react-router'

import { PublicSchoolPage } from '@/features/public/components/PublicSchoolPage'

/** Page publique d'une école : /{slug}, sans session ni affectation (résolution publique par slug, ADR 0005). */
export const Route = createFileRoute('/$school/')({
  component: PublicRoute,
})

function PublicRoute() {
  const { school } = Route.useParams()
  return <PublicSchoolPage slug={school} />
}
