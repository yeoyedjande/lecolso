import { Lock, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker, TermSelect } from '@/components/ClassPicker'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { schoolToday } from '@/features/attendance/status'
import { ValidationError } from '@/lib/api/errors'
import { formatAverage, formatRank } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  useClassResults,
  useCreateAssessment,
  useDeleteAssessment,
  useGradeGrid,
  useGradingClassrooms,
  useUpdateAssessment,
  type Assessment,
  type GradeGrid,
} from '../api'
import { rankOf } from '../gradeInput'
import { GradeGridEditor } from './GradeGridEditor'

function Results({ classroomId, termId }: { classroomId: string; termId: string | null }) {
  const { t } = useTranslation()
  const query = useClassResults(classroomId, termId)
  return (
    <QueryState query={query}>
      {(results) => {
        const low = results.grade_scale / 2
        const ranks = results.rows.map((row) => row.rank)
        return (
          <div className="grid gap-3">
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-1">
                <dt className="text-muted-foreground">{t('grades.classAverageLabel')}</dt>
                <dd className="font-semibold tabular">{formatAverage(results.class_average)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-muted-foreground">{t('grades.highest')}</dt>
                <dd className="font-semibold tabular">{formatAverage(results.highest)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-muted-foreground">{t('grades.lowest')}</dt>
                <dd className="font-semibold tabular">{formatAverage(results.lowest)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-muted-foreground">{t('grades.scale')}</dt>
                <dd className="font-semibold tabular">
                  {t('grades.outOf', { count: results.grade_scale })}
                </dd>
              </div>
            </dl>
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('grades.rank')}</TableHead>
                    <TableHead>{t('grades.student')}</TableHead>
                    {results.subjects.map((subject) => (
                      <TableHead key={subject.id} className="text-center">
                        <span className="grid">
                          <span>{subject.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {t('grades.coefficient', { count: subject.coefficient })}
                          </span>
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">{t('grades.generalAverage')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...results.rows]
                    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                    .map((row) => (
                      <TableRow key={row.student.id}>
                        <TableCell className="font-semibold">
                          {formatRank(rankOf(row.rank, ranks))}
                        </TableCell>
                        <TableCell className="font-medium">{row.student.full_name}</TableCell>
                        {row.subjects.map((cell) => (
                          <TableCell
                            key={cell.subject_id}
                            className={cn(
                              'text-center tabular',
                              cell.average !== null && cell.average < low && 'text-destructive-ink',
                            )}
                          >
                            {formatAverage(cell.average)}
                          </TableCell>
                        ))}
                        <TableCell
                          className={cn(
                            'text-right font-display font-bold tabular',
                            row.average !== null && row.average < low && 'text-destructive-ink',
                          )}
                        >
                          {formatAverage(row.average)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )
      }}
    </QueryState>
  )
}

/** Date par défaut d'une nouvelle évaluation : aujourd'hui, ramené dans la période. */
function defaultDate(grid: GradeGrid): string {
  const today = schoolToday()
  if (today < grid.term.starts_on) return grid.term.starts_on
  if (today > grid.term.ends_on) return grid.term.ends_on
  return today
}

function AssessmentDialog({
  grid,
  classroomId,
  assessment,
  onClose,
}: {
  grid: GradeGrid
  classroomId: string
  assessment: Assessment | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateAssessment()
  const update = useUpdateAssessment()
  const remove = useDeleteAssessment()
  const [title, setTitle] = useState(assessment?.title ?? '')
  const [date, setDate] = useState(assessment?.date ?? defaultDate(grid))
  const [outOf, setOutOf] = useState(String(assessment?.out_of ?? grid.grade_scale))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const subjectId = grid.subject?.id ?? ''
  const pending = create.isPending || update.isPending || remove.isPending

  const submit = async () => {
    const body = {
      subject_id: subjectId,
      term_id: grid.term.id,
      title: title.trim(),
      date,
      out_of: Number(outOf),
    }
    try {
      if (assessment === null) await create.mutateAsync({ classroomId, ...body })
      else await update.mutateAsync({ id: assessment.id, ...body })
      onClose()
    } catch (error) {
      if (error instanceof ValidationError)
        setErrors(
          Object.fromEntries(
            Object.entries(error.fields).map(([field, messages]) => [field, messages[0] ?? '']),
          ),
        )
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle>
          {assessment === null ? t('grades.addAssessment') : t('grades.editTitle')}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          {t('grades.assessmentFor', { subject: grid.subject?.name ?? '', term: grid.term.label })}
        </p>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Field label={t('grades.assessmentTitle')} error={errors.title}>
            {(control) => (
              <Input
                {...control}
                required
                maxLength={80}
                placeholder={t('grades.assessmentTitlePlaceholder')}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                }}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('grades.assessmentDate')} error={errors.date}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  required
                  min={grid.term.starts_on}
                  max={grid.term.ends_on}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field label={t('grades.assessmentOutOf')} error={errors.out_of}>
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  max={100}
                  value={outOf}
                  onChange={(event) => {
                    setOutOf(event.target.value)
                  }}
                />
              )}
            </Field>
          </div>
          <DialogFooter className="gap-2">
            {assessment !== null && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive-ink sm:mr-auto"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(t('grades.deleteConfirm', { title: assessment.title }))) {
                    void remove.mutateAsync(assessment.id).then(onClose)
                  }
                }}
              >
                <Trash2 aria-hidden />
                {t('grades.deleteAssessment')}
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={title.trim() === '' || pending}>
              {assessment === null ? t('grades.create') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Notes : saisie en grille (classes évaluées par moyenne pondérée), moyennes et rangs. */
export function GradesPage() {
  const { t } = useTranslation()
  const classes = useGradingClassrooms()
  const classrooms = (classes.data ?? []).filter(
    (classroom) => classroom.mode === 'weighted_average',
  )
  const [classroomId, setClassroomId] = useState('')
  const [termId, setTermId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ assessment: Assessment | null } | null>(null)

  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]
  const grid = useGradeGrid(classroom?.id ?? '', termId, subjectId)
  const data = grid.data

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('grades.title')}
        description={t('grades.description')}
        actions={
          data?.can_manage === true &&
          data.subject !== null && (
            <Button
              variant="outline"
              onClick={() => {
                setDialog({ assessment: null })
              }}
            >
              <Plus aria-hidden />
              {t('grades.addAssessment')}
            </Button>
          )
        }
      />
      {classes.isPending ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('grades.noClass')} />
      ) : (
        <Tabs defaultValue="entry">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="entry">{t('grades.tabs.entry')}</TabsTrigger>
              <TabsTrigger value="results">{t('grades.tabs.results')}</TabsTrigger>
            </TabsList>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
              <ClassPicker
                classrooms={classrooms}
                value={classroom.id}
                onChange={(id) => {
                  // Période et matière propres à la classe (autre cycle, autre niveau) : celles du jour par défaut
                  setClassroomId(id)
                  setTermId(null)
                  setSubjectId(null)
                }}
              />
              <NativeSelect
                aria-label={t('grades.subject')}
                value={data?.subject?.id ?? ''}
                disabled={data === undefined}
                onChange={(event) => {
                  setSubjectId(event.target.value)
                }}
              >
                {(data?.subjects ?? []).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </NativeSelect>
              <TermSelect
                terms={data?.terms ?? []}
                value={data?.term.id ?? ''}
                onChange={setTermId}
              />
            </div>
          </div>
          <TabsContent value="entry" className="mt-4">
            <QueryState query={grid}>
              {(loaded) =>
                loaded.subject === null ? (
                  <EmptyState title={t('grades.noSubject')} />
                ) : loaded.assessments.length === 0 ? (
                  <EmptyState title={t('grades.noAssessment')} />
                ) : loaded.rows.length === 0 ? (
                  <EmptyState title={t('grades.noStudent')} />
                ) : (
                  <div className="grid gap-3">
                    {loaded.closed && (
                      <p
                        className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"
                        role="status"
                      >
                        <Lock className="size-4 shrink-0" aria-hidden />
                        {t('grades.closedBanner')}
                      </p>
                    )}
                    <GradeGridEditor
                      key={`${loaded.term.id}-${loaded.subject.id}-${loaded.assessments.map((a) => `${a.id}:${String(a.out_of)}`).join(',')}`}
                      grid={loaded}
                      onEdit={(assessment) => {
                        setDialog({ assessment })
                      }}
                    />
                  </div>
                )
              }
            </QueryState>
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <Results classroomId={classroom.id} termId={termId ?? data?.term.id ?? null} />
          </TabsContent>
        </Tabs>
      )}
      {dialog !== null && data !== undefined && classroom !== undefined && (
        <AssessmentDialog
          grid={data}
          classroomId={classroom.id}
          assessment={dialog.assessment}
          onClose={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
