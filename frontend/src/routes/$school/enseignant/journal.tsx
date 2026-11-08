import { createFileRoute } from '@tanstack/react-router'

import { DaycarePage } from '@/features/attendance/components/DaycarePage'

export const Route = createFileRoute('/$school/enseignant/journal')({
  component: DaycarePage,
})
