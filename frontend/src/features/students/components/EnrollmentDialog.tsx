import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DialogClose, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useClassroomList } from '@/features/classes/api'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useUpdateEnrollment, type StudentEnrollment, type StudentFile } from '../api'

export type EnrollmentAction = 'move' | 'leave' | 'return'

const CONFLICTS = ['classroom_full', 'year_closed', 'other_year'] as const

/** Changer de classe (même année), noter un départ ou un retour : contenu d'une boîte de dialogue. */
export function EnrollmentDialog({
  file,
  enrollment,
  action,
  onDone,
}: {
  file: StudentFile
  enrollment: StudentEnrollment
  action: EnrollmentAction
  onDone: () => void
}) {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const update = useUpdateEnrollment()
  const classrooms = useClassroomList(enrollment.academic_year.id)
  const [classroomId, setClassroomId] = useState('')
  const [leftOn, setLeftOn] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scope = school?.permissions['students.manage']
  const targets = (classrooms.data ?? []).filter(
    (candidate) =>
      candidate.id !== enrollment.classroom.id &&
      scope !== undefined &&
      (scope === null || scope.includes(candidate.level.cycle_id)),
  )

  const confirm = async () => {
    setError(null)
    if (action === 'move' && classroomId === '') {
      setError(t('enrollment.errors.classroom'))
      return
    }
    try {
      await update.mutateAsync({
        id: enrollment.id,
        input:
          action === 'move'
            ? { classroom_id: classroomId }
            : action === 'leave'
              ? {
                  status: 'left',
                  left_on: leftOn,
                  leave_reason: reason.trim() === '' ? null : reason.trim(),
                }
              : { status: 'active' },
      })
      toast(t(`students.schooling.done.${action}`, { name: file.full_name }), { tone: 'success' })
      onDone()
    } catch (caught) {
      if (caught instanceof ConflictError) {
        const code = CONFLICTS.find((candidate) => candidate === caught.code)
        setError(code === undefined ? caught.message : t(`enrollment.conflicts.${code}`))
      } else if (caught instanceof ValidationError) {
        setError(Object.values(caught.fields)[0]?.[0] ?? t('enrollment.failed'))
      } else {
        setError(t('enrollment.failed'))
      }
    }
  }

  return (
    <>
      <DialogTitle>
        {t(`students.schooling.titles.${action}`, { name: file.full_name })}
      </DialogTitle>
      <DialogDescription>{t(`students.schooling.descriptions.${action}`)}</DialogDescription>
      <div className="grid gap-4">
        {error !== null && <FormAlert>{error}</FormAlert>}
        {action === 'move' && (
          <Field label={t('enrollment.classroom')}>
            {(c) => (
              <NativeSelect
                {...c}
                value={classroomId}
                onChange={(event) => {
                  setClassroomId(event.target.value)
                }}
              >
                <option value="">{t('enrollment.chooseClassroom')}</option>
                {targets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        )}
        {action === 'leave' && (
          <>
            <Field label={t('students.schooling.leftOn')}>
              {(c) => (
                <Input
                  {...c}
                  type="date"
                  value={leftOn}
                  onChange={(event) => {
                    setLeftOn(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field label={t('students.schooling.reason')} hint={t('enrollment.optional')}>
              {(c) => (
                <Input
                  {...c}
                  value={reason}
                  maxLength={200}
                  onChange={(event) => {
                    setReason(event.target.value)
                  }}
                />
              )}
            </Field>
          </>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">{t('common.cancel')}</Button>
        </DialogClose>
        <Button
          variant={action === 'leave' ? 'destructive' : 'accent'}
          disabled={update.isPending}
          onClick={() => void confirm()}
        >
          {t(`students.schooling.confirm.${action}`)}
        </Button>
      </DialogFooter>
    </>
  )
}
