import { createFileRoute } from '@tanstack/react-router'

import { PreRegistrationPage } from '@/features/public/components/PreRegistrationPage'

export const Route = createFileRoute('/ecole/$slug/preinscription')({
  component: PreRegistrationRoute,
})

function PreRegistrationRoute() {
  const { slug } = Route.useParams()
  return <PreRegistrationPage slug={slug} />
}
