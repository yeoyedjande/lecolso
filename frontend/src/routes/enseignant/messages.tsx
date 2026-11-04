import { createFileRoute } from '@tanstack/react-router'

import { TeacherMessages } from '@/features/teacher/components/TeacherMessages'

export const Route = createFileRoute('/enseignant/messages')({
  component: TeacherMessages,
})
