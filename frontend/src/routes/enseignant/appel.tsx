import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { TeacherRollCall } from '@/features/teacher/components/TeacherRollCall'

export const Route = createFileRoute('/enseignant/appel')({
  validateSearch: z.object({ classe: z.catch(z.optional(z.string()), undefined) }),
  component: PageRoute,
})

function PageRoute() {
  const { classe } = Route.useSearch()
  return <TeacherRollCall classroomId={classe} />
}
