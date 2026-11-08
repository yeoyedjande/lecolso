import { Check, FileCheck2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ConflictError } from '@/lib/api/errors'
import { formatDate, formatLongDate } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import {
  useAbsences,
  useAttendanceClassrooms,
  useAttendanceHistory,
  useDecideJustification,
  useDecidePlannedAbsence,
  useJustifyAbsence,
  usePlannedAbsences,
  useRollCall,
  type Absence,
  type PlannedAbsence,
} from '../api'
import { justificationKey, monthEnd, schoolToday } from '../status'

import { RollCallPanel } from './RollCallPanel'

function History({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation()
  const today = schoolToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const end = monthEnd(month)
  const query = useAttendanceHistory(classroomId, `${month}-01`, end > today ? today : end)

  return (
    <div className="grid gap-4">
      <Field label={t('attendance.month')} className="max-w-xs">
        {(control) => (
          <Input
            {...control}
            type="month"
            max={today.slice(0, 7)}
            value={month}
            onChange={(event) => {
              if (event.target.value !== '') setMonth(event.target.value)
            }}
          />
        )}
      </Field>
      <QueryState query={query}>
        {(days) => {
          const taken = days.filter((day) => day.taken)
          const totalPresent = taken.reduce((sum, day) => sum + day.present, 0)
          const total = taken.reduce((sum, day) => sum + day.present + day.absent, 0)
          return days.length === 0 ? (
            <EmptyState title={t('attendance.noDay')} />
          ) : (
            <div className="grid gap-3">
              <p className="font-semibold">
                {t('attendance.rate', {
                  rate: total === 0 ? 100 : Math.round((totalPresent / total) * 1000) / 10,
                })}
              </p>
              <Card className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('attendance.day')}</TableHead>
                      <TableHead className="text-right">{t('attendance.present')}</TableHead>
                      <TableHead className="text-right">{t('attendance.absent')}</TableHead>
                      <TableHead className="text-right">{t('attendance.late')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...days].reverse().map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium capitalize">
                          {formatLongDate(day.date)}
                        </TableCell>
                        {day.taken ? (
                          <>
                            <TableCell className="text-right tabular">{day.present}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right font-semibold tabular',
                                day.absent > 0 && 'text-destructive-ink',
                              )}
                            >
                              {day.absent}
                            </TableCell>
                            <TableCell className="text-right tabular">{day.late}</TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={3} className="text-right">
                            <Badge variant="accent">{t('attendance.notTakenShort')}</Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}

function JustifyDialog({ absence, onClose }: { absence: Absence; onClose: () => void }) {
  const { t } = useTranslation()
  const justify = useJustifyAbsence()
  const [reason, setReason] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle>
          {t('attendance.justifyTitle', { name: absence.student.full_name })}
        </DialogTitle>
        <DialogDescription>{t('attendance.justifyHint')}</DialogDescription>
        <Field label={t('attendance.justifyReason')}>
          {(control) => (
            <Input
              {...control}
              value={reason}
              maxLength={300}
              onChange={(event) => {
                setReason(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label={t('attendance.proof')} hint={t('attendance.proofHint')}>
          {(control) => (
            <Input
              {...control}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setProof(event.target.files?.[0] ?? null)
              }}
            />
          )}
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            variant="accent"
            disabled={reason.trim().length < 3 || justify.isPending}
            onClick={() => {
              justify
                .mutateAsync({ markId: absence.id, reason: reason.trim(), proof })
                .then(() => {
                  toast(t('attendance.justifiedDone'), { tone: 'success' })
                  onClose()
                })
                .catch(() => {
                  toast(t('common.error'), { tone: 'error' })
                })
            }}
          >
            <FileCheck2 aria-hidden />
            {t('attendance.justify')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Absences() {
  const { t } = useTranslation()
  const today = schoolToday()
  const [date, setDate] = useState(today)
  const [pending, setPending] = useState(false)
  const [justifying, setJustifying] = useState<Absence | null>(null)
  const query = useAbsences({ date: pending ? null : date, pending })
  const decide = useDecideJustification()

  const onDecide = (absence: Absence, accepted: boolean) => {
    if (absence.justification === null) return
    decide
      .mutateAsync({ justificationId: absence.justification.id, accepted, note: null })
      .then(() => {
        toast(accepted ? t('attendance.accepted') : t('attendance.refused'), { tone: 'success' })
      })
      .catch((caught: unknown) => {
        toast(caught instanceof ConflictError ? caught.message : t('common.error'), {
          tone: 'error',
        })
      })
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label={t('attendance.date')} className="max-w-xs">
          {(control) => (
            <Input
              {...control}
              type="date"
              max={today}
              disabled={pending}
              value={date}
              onChange={(event) => {
                if (event.target.value !== '') setDate(event.target.value)
              }}
            />
          )}
        </Field>
        <div className="flex min-h-11 items-center gap-2">
          <Checkbox
            id="absences-pending"
            checked={pending}
            onCheckedChange={(checked) => {
              setPending(checked === true)
            }}
          />
          <Label htmlFor="absences-pending">{t('attendance.pendingOnly')}</Label>
        </div>
      </div>
      <QueryState query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title={pending ? t('attendance.noPending') : t('attendance.noAbsenceToday')}
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('students.student')}</TableHead>
                    <TableHead>{t('attendance.status')}</TableHead>
                    <TableHead>{t('attendance.justificationTitle')}</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">{t('common.actions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar
                            name={row.student.full_name}
                            photoUrl={row.student.photo_url}
                            size="sm"
                          />
                          <span className="grid">
                            <span className="font-medium">{row.student.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.classroom.name}
                              {pending && ` · ${formatDate(row.date)}`}
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'late' ? 'accent' : 'destructive'}>
                          {t(`attendanceStatus.${row.status === 'late' ? 'late' : 'absent'}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.justification === null ? (
                          <span className="text-muted-foreground">
                            {t('students.detail.notJustified')}
                          </span>
                        ) : (
                          <span className="grid gap-0.5">
                            <span className="font-medium">
                              {t(
                                `attendance.justification.${justificationKey(row.justification.status)}`,
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {row.justification.reason}
                            </span>
                            {row.justification.proof_url !== null && (
                              <a
                                href={row.justification.proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent-ink underline"
                              >
                                {t('attendance.seeProof')}
                              </a>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.can_decide && row.justification?.status === 'pending' && (
                          <span className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={decide.isPending}
                              onClick={() => {
                                onDecide(row, true)
                              }}
                            >
                              <Check aria-hidden />
                              {t('attendance.accept')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={decide.isPending}
                              onClick={() => {
                                onDecide(row, false)
                              }}
                            >
                              <X aria-hidden />
                              {t('attendance.refuse')}
                            </Button>
                          </span>
                        )}
                        {row.can_decide &&
                          (row.justification === null ||
                            row.justification.status === 'refused') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setJustifying(row)
                              }}
                            >
                              <FileCheck2 aria-hidden />
                              {t('attendance.justify')}
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        }
      </QueryState>
      {justifying !== null && (
        <JustifyDialog
          absence={justifying}
          onClose={() => {
            setJustifying(null)
          }}
        />
      )}
    </div>
  )
}

/** Absences annoncées par les parents (en cours ou à venir) : la direction les accepte ou les refuse. */
function PlannedAbsences() {
  const { t } = useTranslation()
  const query = usePlannedAbsences()
  const decide = useDecidePlannedAbsence()
  const rows = query.data ?? []
  if (rows.length === 0) return null

  const onDecide = (planned: PlannedAbsence, accepted: boolean) => {
    decide
      .mutateAsync({ plannedId: planned.id, accepted })
      .then(() => {
        toast(accepted ? t('attendance.accepted') : t('attendance.refused'), { tone: 'success' })
      })
      .catch((caught: unknown) => {
        toast(caught instanceof ConflictError ? caught.message : t('common.error'), {
          tone: 'error',
        })
      })
  }

  return (
    <section aria-labelledby="planned-title" className="grid gap-2">
      <h2 id="planned-title" className="font-display text-lg font-semibold">
        {t('attendance.planned.title')}
      </h2>
      <ul className="grid gap-2">
        {rows.map((planned) => (
          <li key={planned.id}>
            <Card className="flex flex-wrap items-center gap-3 p-3">
              <Avatar
                name={planned.student.full_name}
                photoUrl={planned.student.photo_url}
                size="sm"
              />
              <span className="grid min-w-0 flex-1 gap-0.5 text-sm">
                <span className="font-medium">
                  {planned.student.full_name}
                  <span className="text-muted-foreground">{` · ${planned.classroom.name}`}</span>
                </span>
                <span>
                  {planned.starts_on === planned.ends_on
                    ? t('attendance.planned.on', { date: formatDate(planned.starts_on) })
                    : t('attendance.planned.range', {
                        from: formatDate(planned.starts_on),
                        to: formatDate(planned.ends_on),
                      })}
                  {` · ${planned.reason}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('attendance.planned.by', { name: planned.submitted_by_name })}
                </span>
              </span>
              {planned.status === 'pending' && planned.can_decide ? (
                <span className="inline-flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => {
                      onDecide(planned, true)
                    }}
                  >
                    <Check aria-hidden />
                    {t('attendance.accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={decide.isPending}
                    onClick={() => {
                      onDecide(planned, false)
                    }}
                  >
                    <X aria-hidden />
                    {t('attendance.refuse')}
                  </Button>
                </span>
              ) : (
                <Badge variant={planned.status === 'accepted' ? 'success' : 'outline'}>
                  {t(`attendance.justification.${justificationKey(planned.status)}`)}
                </Badge>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RollCallTab({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation()
  const today = schoolToday()
  const [date, setDate] = useState(today)
  const query = useRollCall(classroomId, date)
  return (
    <div className="grid gap-4">
      <Field label={t('attendance.date')} className="max-w-xs">
        {(control) => (
          <Input
            {...control}
            type="date"
            max={today}
            value={date}
            onChange={(event) => {
              if (event.target.value !== '') setDate(event.target.value)
            }}
          />
        )}
      </Field>
      <p className="text-sm text-muted-foreground first-letter:uppercase">{formatLongDate(date)}</p>
      <QueryState query={query}>
        {(call) =>
          call === null ? (
            <EmptyState title={t('attendance.noClass')} />
          ) : (
            <RollCallPanel key={`${classroomId}-${date}-${call.taken?.at ?? ''}`} call={call} />
          )
        }
      </QueryState>
    </div>
  )
}

/** Présences (vraie API) : appel des classes en « roll_call », historique, absences et justifications. */
export function AttendancePage() {
  const { t } = useTranslation()
  const query = useAttendanceClassrooms()
  const [classroomId, setClassroomId] = useState('')
  const classrooms = (query.data ?? []).filter((candidate) => candidate.mode === 'roll_call')
  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]

  return (
    <div className="grid grid-cols-1 gap-6">
      <ScreenHeader title={t('attendance.title')} description={t('attendance.description')} />
      {query.isPending ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('attendance.noClass')} />
      ) : (
        <Tabs defaultValue="rollCall">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="rollCall">{t('attendance.tabs.rollCall')}</TabsTrigger>
              <TabsTrigger value="history">{t('attendance.tabs.history')}</TabsTrigger>
              <TabsTrigger value="today">{t('attendance.tabs.today')}</TabsTrigger>
            </TabsList>
            <div className="w-full sm:w-56">
              <NativeSelect
                aria-label={t('grades.classroom')}
                value={classroom.id}
                onChange={(event) => {
                  setClassroomId(event.target.value)
                }}
              >
                {classrooms.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <TabsContent value="rollCall" className="mt-4">
            <RollCallTab classroomId={classroom.id} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <History classroomId={classroom.id} />
          </TabsContent>
          <TabsContent value="today" className="mt-4">
            <div className="grid gap-6">
              <PlannedAbsences />
              <Absences />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
