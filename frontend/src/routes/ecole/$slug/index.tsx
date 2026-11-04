import { createFileRoute } from '@tanstack/react-router'

import { PublicSchoolPage } from '@/features/public/components/PublicSchoolPage'

/** Page publique d'une école (sans connexion). En production, servie aussi sur <slug>.<domaine>. */
export const Route = createFileRoute('/ecole/$slug/')({
  component: PublicRoute,
})

function PublicRoute() {
  const { slug } = Route.useParams()
  return <PublicSchoolPage slug={slug} />
}
