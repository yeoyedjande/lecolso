import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod/mini'

import { TeacherStudents } from '@/features/teacher/components/TeacherStudents'

export const Route = createFileRoute('/$school/enseignant/eleves/')({
  validateSearch: z.object({ classe: z.catch(z.optional(z.string()), undefined) }),
  component: PageRoute,
})

function PageRoute() {
  const { classe } = Route.useSearch()
  return <TeacherStudents classroomId={classe} />
}
