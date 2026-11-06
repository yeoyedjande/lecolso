import { createFileRoute } from '@tanstack/react-router'

import { TeacherStudentFile } from '@/features/teacher/components/TeacherStudentFile'

export const Route = createFileRoute('/$school/enseignant/eleves/$studentId')({
  component: PageRoute,
})

function PageRoute() {
  const { studentId } = Route.useParams()
  return <TeacherStudentFile studentId={studentId} />
}
