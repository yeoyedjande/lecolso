import { useNavigate } from '@tanstack/react-router'
import { Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker, TermSelect } from '@/components/ClassPicker'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  useGradeGrid,
  useSaveGrades,
  useSaveSkills,
  useSkillGrid,
  type GradeGrid,
  type SkillGrid,
  type SkillLevel,
} from '@/features/grades/api'
import { AssessmentDialog } from '@/features/grades/components/GradesPage'
import { formatCell, parseCell } from '@/features/grades/gradeInput'
import { formatAverage, formatDayMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useTeacherClasses, type TeacherClass } from '../api'

function ClosedNote() {
  const { t } = useTranslation()
  return (
    <p className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm" role="status">
      <Lock className="size-4 shrink-0" aria-hidden />
      {t('grades.closedBanner')}
    </p>
  )
}

/** Notes d'une évaluation, un élève par ligne : note au barème ou « abs », enregistrée à la sortie du champ. */
function AssessmentEntry({ grid, assessmentId }: { grid: GradeGrid; assessmentId: string }) {
  const { t } = useTranslation()
  const save = useSaveGrades()
  const assessment = grid.assessments.find((candidate) => candidate.id === assessmentId)
  const [texts, setTexts] = useState<Record<string, string>>({})
  if (assessment === undefined) return null
  const editable = grid.can_manage

  return (
    <div className="grid gap-3">
      <p className="h-4 text-right text-xs text-muted-foreground" aria-live="polite">
        {save.isPending
          ? t('grades.saving')
          : save.isError
            ? t('grades.saveFailed')
            : save.data?.queued === true
              ? t('grades.queued')
              : save.isSuccess
                ? t('grades.saved')
                : ''}
      </p>
      <ul className="grid gap-2">
        {grid.rows.map((row) => {
          const cell = row.grades.find(
            (candidate) => candidate.assessment_id === assessment.id,
          ) ?? {
            value: null,
            absent: false,
          }
          const text = texts[row.student.id] ?? formatCell(cell)
          const parsed = parseCell(text, assessment.out_of)
          const commit = (next: { value: number | null; absent: boolean }) => {
            if (!editable || (next.value === cell.value && next.absent === cell.absent)) return
            save.mutate({ assessment, grades: [{ student_id: row.student.id, ...next }] })
          }
          return (
            <li key={row.student.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar name={row.student.full_name} photoUrl={row.student.photo_url} size="sm" />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{row.student.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('teacher.grades.average', {
                        value: formatAverage(row.average),
                        scale: grid.grade_scale,
                      })}
                    </span>
                  </span>
                  <Input
                    inputMode="decimal"
                    readOnly={!editable}
                    aria-label={t('grades.cell', {
                      student: row.student.full_name,
                      assessment: assessment.title,
                    })}
                    aria-invalid={parsed === undefined}
                    title={
                      parsed === undefined
                        ? t('grades.invalid', { max: assessment.out_of })
                        : undefined
                    }
                    className={cn(
                      'h-12 w-20 text-center text-lg font-semibold tabular',
                      parsed === undefined && 'bg-destructive-soft',
                    )}
                    value={text}
                    onFocus={(event) => {
                      event.target.select()
                    }}
                    onChange={(event) => {
                      setTexts((previous) => ({
                        ...previous,
                        [row.student.id]: event.target.value,
                      }))
                    }}
                    onBlur={() => {
                      if (parsed !== undefined) commit(parsed)
                    }}
                  />
                  {editable && (
                    <Button
                      type="button"
                      variant={cell.absent ? 'accent' : 'outline'}
                      size="sm"
                      className="h-12"
                      aria-pressed={cell.absent}
                      aria-label={t('teacher.grades.absentFor', { name: row.student.full_name })}
                      onClick={() => {
                        const next = cell.absent
                          ? { value: null, absent: false }
                          : { value: null, absent: true }
                        setTexts((previous) => ({
                          ...previous,
                          [row.student.id]: formatCell(next),
                        }))
                        commit(next)
                      }}
                    >
                      {t('teacher.grades.absent')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GradeEntry({ classroom }: { classroom: TeacherClass }) {
  const { t } = useTranslation()
  const [termId, setTermId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const query = useGradeGrid(classroom.id, termId, subjectId)
  const grid = query.data

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <TermSelect
          terms={grid?.terms ?? []}
          value={grid?.term.id ?? ''}
          onChange={(id) => {
            setTermId(id)
            setChosen(null)
          }}
        />
        <NativeSelect
          aria-label={t('grades.subject')}
          value={grid?.subject?.id ?? ''}
          disabled={grid === undefined}
          onChange={(event) => {
            setSubjectId(event.target.value)
            setChosen(null)
          }}
        >
          {(grid?.subjects ?? []).map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <QueryState query={query}>
        {(loaded) => {
          const assessmentId =
            loaded.assessments.find((candidate) => candidate.id === chosen)?.id ??
            loaded.assessments.at(-1)?.id ??
            ''
          return (
            <div className="grid gap-4">
              {loaded.closed && <ClosedNote />}
              {loaded.subject === null ? (
                <EmptyState title={t('grades.noSubject')} />
              ) : (
                <div className="flex items-end gap-2">
                  {loaded.assessments.length > 0 && (
                    <Field label={t('teacher.grades.assessment')} className="flex-1">
                      {(control) => (
                        <NativeSelect
                          {...control}
                          value={assessmentId}
                          onChange={(event) => {
                            setChosen(event.target.value)
                          }}
                        >
                          {loaded.assessments.map((assessment) => (
                            <option key={assessment.id} value={assessment.id}>
                              {t('teacher.grades.assessmentOption', {
                                title: assessment.title,
                                date: formatDayMonth(assessment.date),
                                outOf: assessment.out_of,
                              })}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </Field>
                  )}
                  {loaded.can_manage && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setAdding(true)
                      }}
                    >
                      <Plus aria-hidden />
                      {t('teacher.grades.new')}
                    </Button>
                  )}
                </div>
              )}
              {loaded.subject !== null && loaded.assessments.length === 0 ? (
                <EmptyState title={t('grades.noAssessment')} />
              ) : loaded.rows.length === 0 ? (
                <EmptyState title={t('grades.noStudent')} />
              ) : (
                <AssessmentEntry
                  key={`${assessmentId}-${loaded.term.id}`}
                  grid={loaded}
                  assessmentId={assessmentId}
                />
              )}
              {adding && (
                <AssessmentDialog
                  grid={loaded}
                  classroomId={classroom.id}
                  assessment={null}
                  onClose={() => {
                    setAdding(false)
                    setChosen(null)
                  }}
                />
              )}
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}

const LEVELS: readonly SkillLevel[] = ['A', 'EA', 'NA']
const TONE: Record<SkillLevel, string> = {
  A: 'data-[on=true]:bg-success-soft data-[on=true]:text-success-ink data-[on=true]:border-success/50',
  EA: 'data-[on=true]:bg-orange-100 data-[on=true]:text-accent-ink data-[on=true]:border-accent/50',
  NA: 'data-[on=true]:bg-destructive-soft data-[on=true]:text-destructive-ink data-[on=true]:border-destructive/50',
}

/** Compétences : une compétence à la fois, un niveau par élève (un toucher pour choisir, un second pour effacer). */
function SkillEntry({ classroom }: { classroom: TeacherClass }) {
  const { t } = useTranslation()
  const [termId, setTermId] = useState<string | null>(null)
  const [skillId, setSkillId] = useState('')
  const query = useSkillGrid(classroom.id, termId)
  const save = useSaveSkills()

  return (
    <QueryState query={query}>
      {(grid: SkillGrid) => {
        const skill = grid.skills.find((candidate) => candidate.id === skillId) ?? grid.skills[0]
        const domains = [...new Set(grid.skills.map((candidate) => candidate.domain))]
        return (
          <div className="grid gap-4">
            <TermSelect terms={grid.terms} value={grid.term.id} onChange={setTermId} />
            {grid.closed && <ClosedNote />}
            {skill === undefined ? (
              <EmptyState title={t('teacher.skills.none')} />
            ) : (
              <>
                <Field label={t('teacher.skills.skill')}>
                  {(control) => (
                    <NativeSelect
                      {...control}
                      value={skill.id}
                      onChange={(event) => {
                        setSkillId(event.target.value)
                      }}
                    >
                      {domains.map((domain) => (
                        <optgroup key={domain} label={domain}>
                          {grid.skills
                            .filter((candidate) => candidate.domain === domain)
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.label}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
                <ul className="grid gap-2">
                  {grid.rows.map((row) => {
                    const current =
                      row.levels.find((cell) => cell.skill_id === skill.id)?.level ?? null
                    return (
                      <li key={row.student.id}>
                        <Card>
                          <CardContent className="flex flex-wrap items-center gap-3 p-3">
                            <Avatar
                              name={row.student.full_name}
                              photoUrl={row.student.photo_url}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {row.student.full_name}
                            </span>
                            <div
                              role="group"
                              aria-label={row.student.full_name}
                              className="flex gap-1"
                            >
                              {LEVELS.map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  disabled={!grid.can_manage}
                                  data-on={current === level}
                                  aria-pressed={current === level}
                                  aria-label={t('teacher.skills.levelFor', {
                                    level: t(`skillLevels.${level}`),
                                    name: row.student.full_name,
                                  })}
                                  className={cn(
                                    'min-h-11 min-w-12 rounded-xl border bg-surface px-2 text-sm font-bold transition disabled:opacity-60',
                                    TONE[level],
                                  )}
                                  onClick={() => {
                                    save.mutate({
                                      classroomId: classroom.id,
                                      termId: grid.term.id,
                                      evaluations: [
                                        {
                                          student_id: row.student.id,
                                          skill_id: skill.id,
                                          level: current === level ? null : level,
                                        },
                                      ],
                                    })
                                  }}
                                >
                                  {t(`skillLevelsShort.${level}`)}
                                </button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        )
      }}
    </QueryState>
  )
}

/** Notes (moyenne pondérée) ou compétences de la classe, d'après le mode d'évaluation de son cycle. */
export function TeacherGrades({ classroomId }: { classroomId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const classes = useTeacherClasses()
  const eligible = (classes.data ?? []).filter(
    (classroom) =>
      classroom.grading?.mode === 'weighted_average' || classroom.grading?.mode === 'competency',
  )
  const classroom = eligible.find((candidate) => candidate.id === classroomId) ?? eligible[0]
  const competency = classroom?.grading?.mode === 'competency'

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">
          {competency ? t('teacher.skills.title') : t('teacher.grades.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {competency ? t('teacher.skills.subtitle') : t('teacher.grades.subtitle')}
        </p>
      </div>
      {classes.data === undefined ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('teacher.grades.noClass')} />
      ) : (
        <>
          {eligible.length > 1 && (
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
          )}
          {competency ? (
            <SkillEntry key={classroom.id} classroom={classroom} />
          ) : (
            <GradeEntry key={classroom.id} classroom={classroom} />
          )}
        </>
      )}
    </div>
  )
}
