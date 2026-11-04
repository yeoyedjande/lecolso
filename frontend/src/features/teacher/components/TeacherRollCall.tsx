import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'

import { ClassPicker } from '@/components/ClassPicker'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { useRollCall } from '@/features/attendance/api'
import { RollCallPanel } from '@/features/attendance/components/RollCallPanel'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycleSettings } from '@/features/cycles/useCycleSettings'
import { formatLongDate } from '@/lib/format'
import { demoToday } from '@/lib/demo/dates'

import { useMyClasses } from '../api'

function Call({ classroomId, editable }: { classroomId: string; editable: boolean }) {
  const query = useRollCall(classroomId)
  return (
    <QueryState query={query}>
      {(call) => (
        <RollCallPanel
          key={`${classroomId}-${call.taken?.at ?? ''}`}
          call={call}
          editable={editable}
        />
      )}
    </QueryState>
  )
}

/** Appel en deux gestes depuis le téléphone (classes de l'enseignant en « roll_call »). */
export function TeacherRollCall({ classroomId }: { classroomId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const school = useCurrentSchool()
  const classes = useMyClasses()
  const { settings } = useCycleSettings()
  const eligible = (classes.data ?? []).filter(
    (classroom) => settings[classroom.cycle]?.attendance_mode === 'roll_call',
  )
  const classroom = eligible.find((candidate) => candidate.id === classroomId) ?? eligible[0]

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">{t('teacher.rollCall.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('teacher.rollCall.subtitle')}</p>
        <p className="text-sm font-medium first-letter:uppercase">{formatLongDate(demoToday())}</p>
      </div>
      {classes.isPending ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('teacher.home.noClass')} />
      ) : (
        <>
          {eligible.length > 1 && (
            <ClassPicker
              classrooms={eligible}
              value={classroom.id}
              label={t('teacher.rollCall.classroom')}
              onChange={(id) => {
                void navigate({ to: '/enseignant/appel', search: { classe: id }, replace: true })
              }}
            />
          )}
          <Call classroomId={classroom.id} editable={can(school, 'attendance.manage')} />
        </>
      )}
    </div>
  )
}
