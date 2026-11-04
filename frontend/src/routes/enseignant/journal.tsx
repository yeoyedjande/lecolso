import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ListSkeleton } from '@/components/states/QueryState'
import { DaycarePage } from '@/features/attendance/components/DaycarePage'
import { useMyClasses } from '@/features/teacher/api'

export const Route = createFileRoute('/enseignant/journal')({
  component: JournalRoute,
})

/** Journal de la journée pour les classes de l'enseignant qui en tiennent un (paramètre daily_log du cycle). */
function JournalRoute() {
  const { t } = useTranslation()
  const classes = useMyClasses()
  if (classes.data === undefined) return <ListSkeleton />
  return (
    <DaycarePage
      journal={{
        classroomIds: classes.data.map((classroom) => classroom.id),
        title: t('teacher.journal.title'),
        description: t('teacher.journal.subtitle'),
      }}
    />
  )
}
