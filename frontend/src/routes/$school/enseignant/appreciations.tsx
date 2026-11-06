import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { TeacherAppreciations } from '@/features/teacher/components/TeacherAppreciations'

export const Route = createFileRoute('/$school/enseignant/appreciations')({
  validateSearch: z.object({ classe: z.catch(z.optional(z.string()), undefined) }),
  component: PageRoute,
})

function PageRoute() {
  const { classe } = Route.useSearch()
  return <TeacherAppreciations classroomId={classe} />
}
