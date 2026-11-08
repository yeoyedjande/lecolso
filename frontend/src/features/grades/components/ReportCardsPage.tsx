import { FileDown, Lock, LockOpen, MessageSquareText, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker, TermSelect } from '@/components/ClassPicker'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatAverage, formatDateTime, formatRank } from '@/lib/format'
import { toast } from '@/lib/toast'

import {
  useCloseTerm,
  useGradingClassrooms,
  useReopenTerm,
  useReportCards,
  useRetryReportCards,
  useSaveAppreciation,
  type Mention,
  type ReportCardRow,
  type ReportCards,
} from '../api'
import { rankOf } from '../gradeInput'

const MENTIONS: readonly Mention[] = ['congratulations', 'honor_roll', 'encouragement', 'warning']

function isMention(value: string | null): value is Mention {
  return MENTIONS.some((mention) => mention === value)
}

/** Message d'une erreur d'enregistrement : conflit métier, première erreur de validation, ou message générique. */
function failure(error: unknown, fallback: string): string {
  if (error instanceof ConflictError) return error.message
  if (error instanceof ValidationError) return Object.values(error.fields)[0]?.[0] ?? fallback
  return fallback
}

/** Appréciations d'un élève : titulaire (générale, par matière) et direction (observation, mention). */
export function AppreciationDialog({
  data,
  row,
  onClose,
}: {
  data: ReportCards
  row: ReportCardRow
  onClose: () => void
}) {
  const { t } = useTranslation()
  const save = useSaveAppreciation()
  const teacherEditable = data.can_comment
  const directorEditable = data.can_validate && data.closure === null
  const [teacher, setTeacher] = useState(row.teacher_comment ?? '')
  const [director, setDirector] = useState(row.director_comment ?? '')
  const [mention, setMention] = useState<Mention | 'auto'>(
    row.mention_chosen && isMention(row.mention) ? row.mention : 'auto',
  )
  const [subjects, setSubjects] = useState<Record<string, string>>(() =>
    Object.fromEntries(row.subjects.map((cell) => [cell.subject_id, cell.comment ?? ''])),
  )
  const proposed = isMention(row.mention_proposed)
    ? t(`reportCards.mentions.${row.mention_proposed}`)
    : t('reportCards.noMention')

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={t('common.close')} className="max-h-[92dvh] overflow-y-auto">
        <DialogTitle>
          {t('reportCards.appreciationsOf', { name: row.student.full_name })}
        </DialogTitle>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            save
              .mutateAsync({
                classroomId: data.classroom.id,
                termId: data.term.id,
                studentId: row.student.id,
                ...(teacherEditable ? { teacher_comment: teacher } : {}),
                ...(teacherEditable && data.document === 'report_card'
                  ? {
                      subjects: row.subjects.map((cell) => ({
                        subject_id: cell.subject_id,
                        comment: subjects[cell.subject_id] ?? null,
                      })),
                    }
                  : {}),
                ...(directorEditable
                  ? { director_comment: director, mention: mention === 'auto' ? null : mention }
                  : {}),
              })
              .then(() => {
                toast(t('reportCards.saved'), { tone: 'success' })
                onClose()
              })
              .catch((error: unknown) => {
                toast(failure(error, t('reportCards.failed')), { tone: 'error' })
              })
          }}
        >
          {data.document === 'report_card' && (
            <div className="grid gap-2">
              {data.subjects.map((subject) => {
                const cell = row.subjects.find((candidate) => candidate.subject_id === subject.id)
                return (
                  <Field
                    key={subject.id}
                    label={t('reportCards.subjectComment', {
                      subject: subject.name,
                      average: formatAverage(cell?.average ?? null),
                    })}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        maxLength={200}
                        disabled={!teacherEditable}
                        value={subjects[subject.id] ?? ''}
                        onChange={(event) => {
                          setSubjects((previous) => ({
                            ...previous,
                            [subject.id]: event.target.value,
                          }))
                        }}
                      />
                    )}
                  </Field>
                )
              })}
            </div>
          )}
          <Field label={t('reportCards.teacherComment')}>
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                maxLength={500}
                disabled={!teacherEditable}
                value={teacher}
                onChange={(event) => {
                  setTeacher(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label={t('reportCards.directorComment')}>
            {(control) => (
              <Textarea
                {...control}
                rows={2}
                maxLength={500}
                disabled={!directorEditable}
                value={director}
                onChange={(event) => {
                  setDirector(event.target.value)
                }}
              />
            )}
          </Field>
          {data.document === 'report_card' && (
            <Field
              label={t('reportCards.mention')}
              hint={t('reportCards.mentionHint', { proposed })}
            >
              {(control) => (
                <NativeSelect
                  {...control}
                  disabled={!directorEditable}
                  value={mention}
                  onChange={(event) => {
                    const value = event.target.value
                    setMention(isMention(value) ? value : 'auto')
                  }}
                >
                  <option value="auto">{t('reportCards.mentionAuto', { proposed })}</option>
                  {MENTIONS.map((value) => (
                    <option key={value} value={value}>
                      {t(`reportCards.mentions.${value}`)}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            {(teacherEditable || directorEditable) && (
              <Button type="submit" disabled={save.isPending}>
                {t('common.save')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Validation ou déverrouillage (motif obligatoire) des bulletins d'une classe pour la période. */
function ClosureDialog({ data, onClose }: { data: ReportCards; onClose: () => void }) {
  const { t } = useTranslation()
  const close = useCloseTerm()
  const reopen = useReopenTerm()
  const [reason, setReason] = useState('')
  const closing = data.closure === null
  const pending = close.isPending || reopen.isPending

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle>
          {closing ? t('reportCards.closeTitle') : t('reportCards.reopenTitle')}
        </DialogTitle>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const input = { classroomId: data.classroom.id, termId: data.term.id }
            ;(closing
              ? close.mutateAsync(input)
              : reopen.mutateAsync({ ...input, reason: reason.trim() })
            )
              .then(() => {
                toast(closing ? t('reportCards.closed') : t('reportCards.reopened'), {
                  tone: 'success',
                })
                onClose()
              })
              .catch((error: unknown) => {
                toast(failure(error, t('reportCards.failed')), { tone: 'error' })
              })
          }}
        >
          <p className="text-sm text-muted-foreground">
            {closing
              ? t('reportCards.closeHelp', {
                  classroom: data.classroom.name,
                  term: data.term.label,
                  count: data.rows.length,
                })
              : t('reportCards.reopenHelp')}
          </p>
          {!closing && (
            <Field label={t('reportCards.reopenReason')}>
              {(control) => (
                <Input
                  {...control}
                  required
                  minLength={3}
                  maxLength={200}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value)
                  }}
                />
              )}
            </Field>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || (!closing && reason.trim().length < 3)}>
              {closing ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
              {closing ? t('reportCards.close') : t('reportCards.reopen')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusCard({ data, onClosure }: { data: ReportCards; onClosure: () => void }) {
  const { t } = useTranslation()
  const retry = useRetryReportCards()
  const pending = data.rows.filter((row) => row.report_card?.status === 'pending').length

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="grid gap-1">
          {data.closure === null ? (
            <p className="font-semibold">{t('reportCards.notClosed')}</p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <Lock className="size-4" aria-hidden />
                {t('reportCards.closedBy', {
                  date: formatDateTime(data.closure.closed_at),
                  name: data.closure.closed_by,
                })}
              </p>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {t('reportCards.pdfStatus', {
                  ready: data.ready_count,
                  pending,
                  failed: data.failed_count,
                })}
              </p>
            </>
          )}
          {data.history
            .filter((closure) => closure.reopened_at !== null)
            .map((closure) => (
              <p key={closure.id} className="text-sm text-muted-foreground">
                {t('reportCards.reopenedBy', {
                  date: formatDateTime(closure.reopened_at ?? ''),
                  name: closure.reopened_by ?? '',
                  reason: closure.reopen_reason ?? '',
                })}
              </p>
            ))}
        </div>
        {data.can_validate && (
          <div className="flex flex-wrap gap-2">
            {data.closure !== null && data.failed_count > 0 && (
              <Button
                variant="outline"
                disabled={retry.isPending}
                onClick={() => {
                  retry.mutate({ classroomId: data.classroom.id, termId: data.term.id })
                }}
              >
                <RotateCw aria-hidden />
                {t('reportCards.retry')}
              </Button>
            )}
            <Button variant={data.closure === null ? 'accent' : 'outline'} onClick={onClosure}>
              {data.closure === null ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
              {data.closure === null ? t('reportCards.close') : t('reportCards.reopen')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Bulletins (moyenne pondérée) et livrets (compétences), document choisi d'après les paramètres du cycle :
 * appréciations, mentions, validation par la direction et PDF produits par le serveur.
 */
export function ReportCardsPage() {
  const { t } = useTranslation()
  const classes = useGradingClassrooms()
  const classrooms = (classes.data ?? []).filter((classroom) => classroom.mode !== 'observation')
  const [classroomId, setClassroomId] = useState('')
  const [termId, setTermId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]
  const query = useReportCards(classroom?.id ?? '', termId)
  const data = query.data

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('reportCards.title')} description={t('reportCards.description')} />
      {classes.isPending ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('reportCards.observation')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary">
              {t(
                data?.document === 'skills_booklet'
                  ? 'reportCards.skillsBooklet'
                  : 'reportCards.reportCard',
              )}
            </Badge>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <ClassPicker
                classrooms={classrooms}
                value={classroom.id}
                onChange={(id) => {
                  setClassroomId(id)
                  setTermId(null)
                }}
              />
              <TermSelect
                terms={data?.terms ?? []}
                value={data?.term.id ?? ''}
                onChange={setTermId}
              />
            </div>
          </div>
          <QueryState query={query}>
            {(loaded) => {
              const ranks = loaded.rows.map((row) => row.rank)
              const booklet = loaded.document === 'skills_booklet'
              return (
                <div className="grid gap-4">
                  <StatusCard
                    data={loaded}
                    onClosure={() => {
                      setClosing(true)
                    }}
                  />
                  {loaded.rows.length === 0 ? (
                    <EmptyState title={t('grades.noStudent')} />
                  ) : (
                    <Card className="overflow-x-auto p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('grades.student')}</TableHead>
                            {booklet ? (
                              <TableHead>{t('reportCards.skillsSummary')}</TableHead>
                            ) : (
                              <>
                                <TableHead className="text-right">
                                  {t('grades.averageOutOf', { count: loaded.grade_scale })}
                                </TableHead>
                                <TableHead>{t('grades.rank')}</TableHead>
                                <TableHead>{t('reportCards.mention')}</TableHead>
                              </>
                            )}
                            <TableHead>{t('reportCards.appreciation')}</TableHead>
                            <TableHead className="text-right">
                              <span className="sr-only">{t('common.actions')}</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loaded.rows.map((row) => (
                            <TableRow key={row.student.id}>
                              <TableCell className="font-medium">{row.student.full_name}</TableCell>
                              {booklet ? (
                                <TableCell className="tabular">
                                  {t('reportCards.skillsCounts', {
                                    a: row.skills?.A ?? 0,
                                    ea: row.skills?.EA ?? 0,
                                    na: row.skills?.NA ?? 0,
                                  })}
                                </TableCell>
                              ) : (
                                <>
                                  <TableCell className="text-right font-semibold tabular">
                                    {formatAverage(row.average)}
                                  </TableCell>
                                  <TableCell>{formatRank(rankOf(row.rank, ranks))}</TableCell>
                                  <TableCell>
                                    {isMention(row.mention) ? (
                                      <Badge
                                        variant={
                                          row.mention === 'warning' ? 'destructive' : 'success'
                                        }
                                      >
                                        {t(`reportCards.mentions.${row.mention}`)}
                                      </Badge>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                <Badge
                                  variant={row.teacher_comment === null ? 'accent' : 'secondary'}
                                >
                                  {row.teacher_comment === null
                                    ? t('reportCards.toWrite')
                                    : t('reportCards.written')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('reportCards.appreciationsOf', {
                                    name: row.student.full_name,
                                  })}
                                  onClick={() => {
                                    setEditing(row.student.id)
                                  }}
                                >
                                  <MessageSquareText aria-hidden />
                                  {t('reportCards.appreciation')}
                                </Button>
                                {row.report_card?.pdf_url != null && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={row.report_card.pdf_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={t('reportCards.pdfOf', {
                                        name: row.student.full_name,
                                      })}
                                    >
                                      <FileDown aria-hidden />
                                      {t('reportCards.pdf')}
                                    </a>
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                  {editing !== null &&
                    (() => {
                      const row = loaded.rows.find((candidate) => candidate.student.id === editing)
                      return row === undefined ? null : (
                        <AppreciationDialog
                          key={row.student.id}
                          data={loaded}
                          row={row}
                          onClose={() => {
                            setEditing(null)
                          }}
                        />
                      )
                    })()}
                  {closing && (
                    <ClosureDialog
                      data={loaded}
                      onClose={() => {
                        setClosing(false)
                      }}
                    />
                  )}
                </div>
              )
            }}
          </QueryState>
        </>
      )}
    </div>
  )
}
