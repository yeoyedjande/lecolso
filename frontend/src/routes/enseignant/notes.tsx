import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { TeacherGrades } from '@/features/teacher/components/TeacherGrades'

export const Route = createFileRoute('/enseignant/notes')({
  validateSearch: z.object({ classe: z.catch(z.optional(z.string()), undefined) }),
  component: PageRoute,
})

function PageRoute() {
  const { classe } = Route.useSearch()
  return <TeacherGrades classroomId={classe} />
}
