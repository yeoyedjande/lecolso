import { createFileRoute } from '@tanstack/react-router'

import { TeacherHome } from '@/features/teacher/components/TeacherHome'

export const Route = createFileRoute('/$school/enseignant/')({
  component: TeacherHome,
})
