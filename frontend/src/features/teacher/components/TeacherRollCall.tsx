import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ClassPicker } from '@/components/ClassPicker'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { useRollCall } from '@/features/attendance/api'
import { RollCallPanel } from '@/features/attendance/components/RollCallPanel'
import { schoolToday } from '@/features/attendance/status'
import { formatLongDate } from '@/lib/format'

import { useTeacherClasses } from '../api'

function Call({ classroomId, date }: { classroomId: string; date: string }) {
  const { t } = useTranslation()
  const query = useRollCall(classroomId, date)
  return (
    <QueryState query={query}>
      {(call) =>
        call === null ? (
          <EmptyState title={t('teacher.home.noClass')} />
        ) : (
          <RollCallPanel key={`${classroomId}-${call.taken?.at ?? ''}`} call={call} />
        )
      }
    </QueryState>
  )
}

/** Appel du jour depuis le téléphone (classes de l'enseignant en « roll_call »), hors connexion compris. */
export function TeacherRollCall({ classroomId }: { classroomId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const classes = useTeacherClasses()
  const eligible = (classes.data ?? []).filter(
    (classroom) => classroom.attendanceMode === 'roll_call',
  )
  const classroom = eligible.find((candidate) => candidate.id === classroomId) ?? eligible[0]
  const today = schoolToday()

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('teacher.rollCall.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('teacher.rollCall.subtitle')}</p>
        <p className="text-sm font-medium first-letter:uppercase">{formatLongDate(today)}</p>
      </div>
      {classes.data === undefined ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('teacher.rollCall.noClass')} />
      ) : (
        <>
          {eligible.length > 1 && (
            <ClassPicker
              classrooms={eligible}
              value={classroom.id}
              label={t('teacher.rollCall.classroom')}
              onChange={(id) => {
                void navigate({
                  from: '/$school',
                  to: '/$school/enseignant/appel',
                  search: { classe: id },
                  replace: true,
                })
              }}
            />
          )}
          <Call classroomId={classroom.id} date={today} />
        </>
      )}
    </div>
  )
}
