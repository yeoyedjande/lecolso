import {
  Baby,
  Bed,
  Heart,
  LogIn,
  LogOut,
  NotebookPen,
  Palette,
  Plus,
  Smile,
  Utensils,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
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
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { usePedagogyClasses } from '@/features/cycles/usePedagogyClasses'
import { formatTime } from '@/lib/format'
import type { DaycareLogKind } from '@/lib/demo/types'
import { toast } from '@/lib/toast'

import { useDemoAddDaycareLog, useDemoDaycareBoard, useDemoDaycareCheck } from '../demoApi'
import type { DaycareBoard } from '../demo'

const KIND_ICONS = {
  meal: Utensils,
  nap: Bed,
  diaper: Baby,
  mood: Smile,
  activity: Palette,
  health: Heart,
} as const
const KINDS = Object.keys(KIND_ICONS).filter((kind): kind is DaycareLogKind => kind in KIND_ICONS)

function nowTime(): string {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Abidjan',
  })
}

type Child = DaycareBoard['children'][number]

/** Garderie : pour chaque enfant (cycles en « check_in_out »), arrivée, départ et journal du jour. */
/** Journal de l'espace enseignant (démonstration jusqu'au lot 8). */
export function DemoDaycarePage({
  journal,
}: { journal?: { classroomIds: string[]; title: string; description: string } } = {}) {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const editable = can(school, 'attendance.manage')
  // Back-office : classes en arrivées/départs ; espace enseignant : ses classes tenant un journal quotidien
  const pedagogy = usePedagogyClasses('attendance.view', (settings) =>
    journal === undefined
      ? settings.attendance_mode === 'check_in_out'
      : settings.daily_log !== 'none',
  )
  const classrooms =
    journal === undefined
      ? pedagogy.classrooms
      : pedagogy.classrooms.filter((classroom) => journal.classroomIds.includes(classroom.id))
  const loading = pedagogy.loading
  const check = useDemoDaycareCheck()
  const addLog = useDemoAddDaycareLog()
  const [checking, setChecking] = useState<{ child: Child; direction: 'in' | 'out' } | null>(null)
  const [logging, setLogging] = useState<Child | null>(null)
  const [by, setBy] = useState('')
  const [time, setTime] = useState(nowTime())
  const [kind, setKind] = useState<DaycareLogKind>('meal')
  const [note, setNote] = useState('')
  const board = useDemoDaycareBoard(classrooms.map((classroom) => classroom.id))

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={journal?.title ?? t('daycare.title')}
        description={journal?.description ?? t('daycare.description')}
      />
      {loading ? (
        <CardsSkeleton count={3} />
      ) : classrooms.length === 0 ? (
        <EmptyState
          title={journal === undefined ? t('daycare.noClass') : t('teacher.journal.noClass')}
        />
      ) : (
        <QueryState query={board} skeleton={<CardsSkeleton count={3} />}>
          {(data) => {
            const children = data.children
            const present = children.filter(
              (child) => child.visit?.arrivedAt != null && child.visit.leftAt === null,
            ).length
            return (
              <div className="grid gap-4">
                <p className="font-semibold">{t('daycare.present', { count: present })}</p>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {children.map((child) => {
                    const arrived = child.visit?.arrivedAt ?? null
                    const left = child.visit?.leftAt ?? null
                    return (
                      <li key={child.student.id}>
                        <Card className="h-full">
                          <CardContent className="grid gap-4 pt-5">
                            <div className="flex items-start gap-3">
                              <Avatar name={child.name} />
                              <div className="grid min-w-0 flex-1 gap-1">
                                <p className="truncate font-semibold">{child.name}</p>
                                <p className="text-xs text-muted-foreground">{child.classroom}</p>
                              </div>
                              {arrived === null ? (
                                <Badge variant="secondary">{t('daycare.notArrived')}</Badge>
                              ) : left === null ? (
                                <Badge variant="success">
                                  {t('daycare.arrived', { time: formatTime(arrived) })}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {t('daycare.left', { time: formatTime(left) })}
                                </Badge>
                              )}
                            </div>
                            {child.visit?.droppedBy != null && (
                              <p className="text-xs text-muted-foreground">
                                {t('daycare.droppedBy', { name: child.visit.droppedBy })}
                                {child.visit.pickedUpBy !== null &&
                                  ` · ${t('daycare.pickedUpBy', { name: child.visit.pickedUpBy })}`}
                              </p>
                            )}
                            <ol className="grid gap-2 border-l-2 border-cycle-daycare/40 pl-3">
                              {child.logs.length === 0 ? (
                                <li className="text-sm text-muted-foreground">
                                  {t('daycare.emptyLog')}
                                </li>
                              ) : (
                                child.logs.map((log) => {
                                  const Icon = KIND_ICONS[log.kind]
                                  return (
                                    <li key={log.id} className="flex items-start gap-2 text-sm">
                                      <Icon
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-cycle-daycare-ink"
                                      />
                                      <span>
                                        <span className="font-semibold tabular">{log.time}</span> ·{' '}
                                        <span className="sr-only">
                                          {t(`daycare.kinds.${log.kind}`)} :{' '}
                                        </span>
                                        {log.note}
                                      </span>
                                    </li>
                                  )
                                })
                              )}
                            </ol>
                            {editable && (
                              <div className="flex flex-wrap gap-2">
                                {arrived === null ? (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setBy(child.student.guardians[0]?.name ?? '')
                                      setTime(nowTime())
                                      setChecking({ child, direction: 'in' })
                                    }}
                                  >
                                    <LogIn aria-hidden />
                                    {t('daycare.checkIn')}
                                  </Button>
                                ) : (
                                  left === null && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setBy(child.student.guardians[0]?.name ?? '')
                                        setTime(nowTime())
                                        setChecking({ child, direction: 'out' })
                                      }}
                                    >
                                      <LogOut aria-hidden />
                                      {t('daycare.checkOut')}
                                    </Button>
                                  )
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setTime(nowTime())
                                    setNote('')
                                    setLogging(child)
                                  }}
                                >
                                  <NotebookPen aria-hidden />
                                  {t('daycare.addLog')}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          }}
        </QueryState>
      )}

      <Dialog
        open={checking !== null}
        onOpenChange={(open) => {
          if (!open) setChecking(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {checking !== null &&
              t(checking.direction === 'in' ? 'daycare.checkInTitle' : 'daycare.checkOutTitle', {
                name: checking.child.name,
              })}
          </DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (checking === null || by.trim() === '') return
              void check
                .mutateAsync({
                  studentId: checking.child.student.id,
                  direction: checking.direction,
                  time,
                  by: by.trim(),
                })
                .then(() => {
                  setChecking(null)
                  toast(t('daycare.saved'), { tone: 'success' })
                })
            }}
          >
            <Field
              label={t('daycare.by')}
              hint={checking?.direction === 'out' ? t('daycare.byHint') : undefined}
            >
              {(control) => (
                <NativeSelect
                  {...control}
                  value={by}
                  onChange={(event) => {
                    setBy(event.target.value)
                  }}
                >
                  {(checking?.child.student.guardians ?? []).map((guardian) => (
                    <option key={guardian.id} value={guardian.name}>
                      {`${guardian.name} (${guardian.relation})`}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field label={t('daycare.time')}>
              {(control) => (
                <Input
                  {...control}
                  type="time"
                  value={time}
                  onChange={(event) => {
                    setTime(event.target.value)
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
              <Button type="submit" disabled={check.isPending}>
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={logging !== null}
        onOpenChange={(open) => {
          if (!open) setLogging(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {logging !== null && t('daycare.addLogTitle', { name: logging.name })}
          </DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (logging === null || note.trim() === '') return
              void addLog
                .mutateAsync({ studentId: logging.student.id, time, kind, note: note.trim() })
                .then(() => {
                  setLogging(null)
                  toast(t('daycare.saved'), { tone: 'success' })
                })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('daycare.kind')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={kind}
                    onChange={(event) => {
                      const value = KINDS.find((candidate) => candidate === event.target.value)
                      if (value !== undefined) setKind(value)
                    }}
                  >
                    {KINDS.map((candidate) => (
                      <option key={candidate} value={candidate}>
                        {t(`daycare.kinds.${candidate}`)}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label={t('daycare.time')}>
                {(control) => (
                  <Input
                    {...control}
                    type="time"
                    value={time}
                    onChange={(event) => {
                      setTime(event.target.value)
                    }}
                  />
                )}
              </Field>
            </div>
            <Field label={t('daycare.note')}>
              {(control) => (
                <Input
                  {...control}
                  required
                  placeholder={t('daycare.notePlaceholder')}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value)
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
              <Button type="submit" disabled={note.trim() === '' || addLog.isPending}>
                <Plus aria-hidden />
                {t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
