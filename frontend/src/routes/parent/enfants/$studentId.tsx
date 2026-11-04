import { createFileRoute } from '@tanstack/react-router'

import { ChildPage } from '@/features/parent/components/ChildPage'

export const Route = createFileRoute('/parent/enfants/$studentId')({
  component: ChildRoute,
})

function ChildRoute() {
  const { studentId } = Route.useParams()
  return <ChildPage studentId={studentId} />
}
