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
import { ConflictError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useDaycareBoard, useDaycareRecord, type DaycareBoard, type DaycareLogKind } from '../api'

const KIND_ICONS = {
  meal: Utensils,
  nap: Bed,
  diaper: Baby,
  mood: Smile,
  activity: Palette,
  health: Heart,
} as const
const KINDS: readonly DaycareLogKind[] = ['meal', 'nap', 'diaper', 'mood', 'activity', 'health']

function kindOf(value: string): DaycareLogKind {
  return KINDS.find((kind) => kind === value) ?? 'activity'
}

function nowTime(): string {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Abidjan',
  })
}

type Child = DaycareBoard['classrooms'][number]['children'][number]

/**
 * Garderie (vraie API) : pour chaque enfant des cycles en « check_in_out », arrivée, départ et journal du jour.
 * Hors connexion, les saisies sont gardées sur l'appareil et envoyées au retour du réseau.
 */
export function DaycarePage() {
  const { t } = useTranslation()
  const board = useDaycareBoard()
  const record = useDaycareRecord()
  const [checking, setChecking] = useState<{ child: Child; direction: 'in' | 'out' } | null>(null)
  const [logging, setLogging] = useState<Child | null>(null)
  const [person, setPerson] = useState('')
  const [time, setTime] = useState(nowTime())
  const [kind, setKind] = useState<DaycareLogKind>('meal')
  const [note, setNote] = useState('')

  const done = (queued: boolean) => {
    toast(queued ? t('attendance.queued') : t('daycare.saved'), { tone: 'success' })
  }
  const failed = (caught: unknown) => {
    toast(caught instanceof ConflictError ? caught.message : t('common.error'), { tone: 'error' })
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <ScreenHeader
        title={t('daycare.title')}
        description={t('daycare.description')}
        demo={false}
      />
      <QueryState query={board} skeleton={<CardsSkeleton count={3} />}>
        {(data) => {
          const children = data.classrooms.flatMap((classroom) =>
            classroom.children.map((child) => ({ child, classroom })),
          )
          const present = children.filter(
            ({ child }) => child.visit?.arrived_at != null && child.visit.left_at === null,
          ).length
          return data.classrooms.length === 0 ? (
            <EmptyState title={t('daycare.noClass')} />
          ) : (
            <div className="grid gap-4">
              <p className="font-semibold">{t('daycare.present', { count: present })}</p>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {children.map(({ child, classroom }) => {
                  const arrived = child.visit?.arrived_at ?? null
                  const left = child.visit?.left_at ?? null
                  return (
                    <li key={child.student.id}>
                      <Card className="h-full">
                        <CardContent className="grid gap-4 pt-5">
                          <div className="flex items-start gap-3">
                            <Avatar
                              name={child.student.full_name}
                              photoUrl={child.student.photo_url}
                            />
                            <div className="grid min-w-0 flex-1 gap-1">
                              <p className="truncate font-semibold">{child.student.full_name}</p>
                              <p className="text-xs text-muted-foreground">{classroom.name}</p>
                            </div>
                            {arrived === null ? (
                              <Badge variant="secondary">{t('daycare.notArrived')}</Badge>
                            ) : left === null ? (
                              <Badge variant="success">
                                {t('daycare.arrived', { time: arrived })}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{t('daycare.left', { time: left })}</Badge>
                            )}
                          </div>
                          {child.visit?.dropped_by != null && (
                            <p className="text-xs text-muted-foreground">
                              {t('daycare.droppedBy', { name: child.visit.dropped_by })}
                              {child.visit.picked_up_by !== null &&
                                ` · ${t('daycare.pickedUpBy', { name: child.visit.picked_up_by })}`}
                            </p>
                          )}
                          <ol className="grid gap-2 border-l-2 border-cycle-daycare/40 pl-3">
                            {child.logs.length === 0 ? (
                              <li className="text-sm text-muted-foreground">
                                {t('daycare.emptyLog')}
                              </li>
                            ) : (
                              child.logs.map((log) => {
                                const logKind = kindOf(log.kind)
                                const Icon = KIND_ICONS[logKind]
                                return (
                                  <li key={log.id} className="flex items-start gap-2 text-sm">
                                    <Icon
                                      aria-hidden
                                      className="mt-0.5 size-4 shrink-0 text-cycle-daycare-ink"
                                    />
                                    <span>
                                      <span className="font-semibold tabular">{log.time}</span> ·{' '}
                                      <span className="sr-only">
                                        {t(`daycare.kinds.${logKind}`)} :{' '}
                                      </span>
                                      {log.note}
                                    </span>
                                  </li>
                                )
                              })
                            )}
                          </ol>
                          {classroom.can_record && (
                            <div className="flex flex-wrap gap-2">
                              {arrived === null ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setPerson('')
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
                                      setPerson('')
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
                name: checking.child.student.full_name,
              })}
          </DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (checking === null) return
              record
                .mutateAsync({
                  kind: 'check',
                  studentId: checking.child.student.id,
                  direction: checking.direction,
                  time,
                  person: person.trim() === '' ? null : person.trim(),
                })
                .then(({ queued }) => {
                  setChecking(null)
                  done(queued)
                })
                .catch(failed)
            }}
          >
            <Field
              label={t('daycare.by')}
              hint={checking?.direction === 'out' ? t('daycare.byHint') : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  value={person}
                  maxLength={120}
                  onChange={(event) => {
                    setPerson(event.target.value)
                  }}
                />
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
              <Button type="submit" disabled={record.isPending || time === ''}>
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
            {logging !== null && t('daycare.addLogTitle', { name: logging.student.full_name })}
          </DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (logging === null || note.trim() === '') return
              record
                .mutateAsync({
                  kind: 'log',
                  studentId: logging.student.id,
                  time,
                  logKind: kind,
                  note: note.trim(),
                })
                .then(({ queued }) => {
                  setLogging(null)
                  done(queued)
                })
                .catch(failed)
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('daycare.kind')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={kind}
                    onChange={(event) => {
                      setKind(kindOf(event.target.value))
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
                  maxLength={500}
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
              <Button type="submit" disabled={note.trim() === '' || record.isPending}>
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
