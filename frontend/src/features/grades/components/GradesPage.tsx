import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Can } from '@/features/auth/RequirePermission'
import { termCount } from '@/features/cycles/useCycleSettings'
import { demoToday } from '@/lib/demo/dates'
import { formatAverage, formatRank } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useAddAssessment, useClassResults, useGradeGrid, useSubjects } from '../api'
import { usePedagogyClasses } from '@/features/cycles/usePedagogyClasses'

import { ClassPicker, TermPicker } from '@/components/ClassPicker'
import { GradeGridEditor } from './GradeGridEditor'

function Results({ classroomId, term }: { classroomId: string; term: number }) {
  const { t } = useTranslation()
  const query = useClassResults(classroomId, term)
  return (
    <QueryState query={query}>
      {(results) => (
        <div className="grid gap-3">
          <p className="font-semibold">{t('grades.classAverage', { value: formatAverage(results.classAverage) })}</p>
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('grades.rank')}</TableHead>
                  <TableHead>{t('grades.student')}</TableHead>
                  {results.subjects.map((subject) => (
                    <TableHead key={subject.code} className="text-center" title={subject.name}>
                      <span className="grid">
                        <span>{subject.code}</span>
                        <span className="text-xs font-normal text-muted-foreground">{t('grades.coefficient', { count: subject.coefficient })}</span>
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">{t('grades.generalAverage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...results.rows]
                  .sort((a, b) => (a.rank?.rank ?? 999) - (b.rank?.rank ?? 999))
                  .map((row) => (
                    <TableRow key={row.student.id}>
                      <TableCell className="font-semibold">{formatRank(row.rank)}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      {results.subjects.map((subject) => {
                        const value = row.bySubject[subject.code] ?? null
                        return (
                          <TableCell key={subject.code} className={cn('text-center tabular', value !== null && value < 10 && 'text-destructive-ink')}>
                            {formatAverage(value)}
                          </TableCell>
                        )
                      })}
                      <TableCell className={cn('text-right font-display font-bold tabular', row.average !== null && row.average < 10 && 'text-destructive-ink')}>
                        {formatAverage(row.average)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </QueryState>
  )
}

/** Notes : saisie en grille (classes évaluées par moyenne pondérée), moyennes et rangs. */
export function GradesPage() {
  const { t } = useTranslation()
  const { classrooms, settingsOf, loading } = usePedagogyClasses('grades.view', (settings) => settings.assessment_mode === 'weighted_average')
  const subjects = useSubjects()
  const [classroomId, setClassroomId] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [term, setTerm] = useState(1)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(demoToday())
  const addAssessment = useAddAssessment()

  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]
  const subject = subjects.data?.find((candidate) => candidate.code === subjectCode) ?? subjects.data?.[0]
  const settings = settingsOf(classroom)
  const grid = useGradeGrid(classroom?.id ?? '', subject?.code ?? '', term)

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('grades.title')}
        description={t('grades.description')}
        actions={
          classroom !== undefined && (
            <Can permission="grades.manage">
              <Button
                variant="outline"
                onClick={() => {
                  setAdding(true)
                }}
              >
                <Plus aria-hidden />
                {t('grades.addAssessment')}
              </Button>
            </Can>
          )
        }
      />
      {loading ? (
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
              <ClassPicker classrooms={classrooms} value={classroom.id} onChange={setClassroomId} />
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
              <TermPicker count={termCount(settings)} type={settings?.term_type ?? 'trimester'} value={term} onChange={setTerm} />
            </div>
          </div>
          <TabsContent value="entry" className="mt-4">
            <QueryState query={grid}>
              {(data) =>
                data.assessments.length === 0 ? (
                  <EmptyState title={t('grades.noAssessment')} />
                ) : (
                  <GradeGridEditor key={`${classroom.id}-${subject?.code ?? ''}-${String(term)}-${String(data.assessments.length)}`} grid={data} />
                )
              }
            </QueryState>
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <Results classroomId={classroom.id} term={term} />
          </TabsContent>
        </Tabs>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{t('grades.addAssessment')}</DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (classroom === undefined || subject === undefined || title.trim() === '') return
              void addAssessment
                .mutateAsync({ classroomId: classroom.id, subjectCode: subject.code, term, title: title.trim(), date })
                .then(() => {
                  setAdding(false)
                  setTitle('')
                })
            }}
          >
            <Field label={t('grades.assessmentTitle')}>
              {(control) => (
                <Input
                  {...control}
                  required
                  placeholder={t('grades.assessmentTitlePlaceholder')}
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field label={t('grades.assessmentDate')}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value)
                  }}
                />
              )}
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={title.trim() === '' || addAssessment.isPending}>
                {t('grades.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
