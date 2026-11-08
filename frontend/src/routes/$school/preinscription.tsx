import { createFileRoute } from '@tanstack/react-router'

import { PreRegistrationPage } from '@/features/public/components/PreRegistrationPage'

export const Route = createFileRoute('/$school/preinscription')({
  component: PreRegistrationRoute,
})

function PreRegistrationRoute() {
  const { school } = Route.useParams()
  return <PreRegistrationPage slug={school} />
}
