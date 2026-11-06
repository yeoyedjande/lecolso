import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker } from '@/components/ClassPicker'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycleSettings } from '@/features/cycles/useCycleSettings'
import { useGradeGrid, useSaveGrade, useSubjects } from '@/features/grades/demoApi'
import type { GradeGrid } from '@/features/grades/demo'
import { formatGrade, parseGrade } from '@/features/grades/gradeInput'
import { formatDayMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useMyClasses } from '../api'

function Entry({ grid, editable }: { grid: GradeGrid; editable: boolean }) {
  const { t } = useTranslation()
  const save = useSaveGrade()
  const [assessmentId, setAssessmentId] = useState(
    grid.assessments[grid.assessments.length - 1]?.id ?? '',
  )
  const assessment = grid.assessments.find((candidate) => candidate.id === assessmentId)
  const [texts, setTexts] = useState<Record<string, string>>({})

  if (assessment === undefined) return <EmptyState title={t('teacher.grades.noAssessment')} />

  return (
    <div className="grid gap-4">
      <Field label={t('teacher.grades.assessment')} hint={t('teacher.grades.hint')}>
        {(control) => (
          <NativeSelect
            {...control}
            value={assessmentId}
            onChange={(event) => {
              setAssessmentId(event.target.value)
              setTexts({})
            }}
          >
            {grid.assessments.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {`${candidate.title} · ${formatDayMonth(candidate.date)}`}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <p className="h-4 text-right text-xs text-muted-foreground" aria-live="polite">
        {save.isPending ? t('grades.saving') : save.isSuccess ? t('grades.saved') : ''}
      </p>
      <ul className="grid gap-2">
        {grid.rows.map((row) => {
          const text = texts[row.student.id] ?? formatGrade(row.values[assessment.id] ?? null)
          const invalid = parseGrade(text) === undefined
          return (
            <li
              key={row.student.id}
              className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-2"
            >
              <label
                htmlFor={`grade-${row.student.id}`}
                className="min-w-0 flex-1 truncate font-medium"
              >
                {row.name}
              </label>
              <Input
                id={`grade-${row.student.id}`}
                inputMode="decimal"
                enterKeyHint="next"
                readOnly={!editable}
                aria-invalid={invalid}
                title={invalid ? t('grades.invalid') : undefined}
                className={cn(
                  'h-12 w-24 text-center font-display text-lg font-bold',
                  invalid && 'bg-destructive-soft',
                )}
                value={text}
                onChange={(event) => {
                  setTexts((previous) => ({ ...previous, [row.student.id]: event.target.value }))
                }}
                onBlur={() => {
                  const value = parseGrade(text)
                  if (
                    !editable ||
                    value === undefined ||
                    value === (row.values[assessment.id] ?? null)
                  )
                    return
                  save.mutate({ assessmentId: assessment.id, studentId: row.student.id, value })
                }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Saisie des notes sur téléphone : une note par élève, grande zone tactile, enregistrement en quittant le champ. */
export function TeacherGrades({ classroomId }: { classroomId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const school = useCurrentSchool()
  const classes = useMyClasses()
  const subjects = useSubjects()
  const { settings } = useCycleSettings()
  const eligible = (classes.data ?? []).filter(
    (classroom) => settings[classroom.cycle]?.assessment_mode === 'weighted_average',
  )
  const classroom = eligible.find((candidate) => candidate.id === classroomId) ?? eligible[0]
  const [subjectCode, setSubjectCode] = useState('')
  const subject =
    subjects.data?.find((candidate) => candidate.code === subjectCode) ?? subjects.data?.[0]
  const grid = useGradeGrid(classroom?.id ?? '', subject?.code ?? '', 1)

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">{t('teacher.grades.title')}</h1>
      </div>
      {classes.isPending ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('teacher.grades.noClass')} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ClassPicker
              classrooms={eligible}
              value={classroom.id}
              onChange={(id) => {
                void navigate({
                  from: '/$school',
                  to: '/$school/enseignant/notes',
                  search: { classe: id },
                  replace: true,
                })
              }}
            />
            <NativeSelect
              aria-label={t('grades.subject')}
              value={subject?.code ?? ''}
              onChange={(event) => {
                setSubjectCode(event.target.value)
              }}
            >
              {(subjects.data ?? []).map((candidate) => (
                <option key={candidate.code} value={candidate.code}>
                  {candidate.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <QueryState query={grid}>
            {(data) => (
              <Entry
                key={`${classroom.id}-${subject?.code ?? ''}`}
                grid={data}
                editable={can(school, 'grades.manage')}
              />
            )}
          </QueryState>
        </>
      )}
    </div>
  )
}
