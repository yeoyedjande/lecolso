import { ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Can } from '@/features/auth/RequirePermission'
import { schoolToday } from '@/features/attendance/status'
import { useCycles } from '@/features/cycles/api'
import { formatDay, formatDayMonth, formatMonth } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import {
  useDeleteEvent,
  useEvents,
  useSaveEvent,
  type SchoolEvent,
  type SchoolEventInput,
  type SchoolEventKind,
} from '../api'

const KINDS: SchoolEventKind[] = ['holiday', 'exam', 'meeting', 'event', 'training']
const KIND_TONE: Record<SchoolEventKind, string> = {
  holiday: 'bg-success-soft text-success-ink',
  exam: 'bg-destructive-soft text-destructive-ink',
  meeting: 'bg-navy-100 text-navy dark:bg-white/10 dark:text-foreground',
  event: 'bg-orange-100 text-accent-ink dark:bg-orange/15',
  training: 'bg-muted text-foreground',
}
function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })

function shiftMonth(month: string, delta: number): string {
  const [year, value] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 2026, (value ?? 1) - 1 + delta, 1))
  return date.toISOString().slice(0, 7)
}

/** Jours affichés : semaines complètes (lundi → dimanche) couvrant le mois. */
function monthGrid(month: string): string[] {
  const first = `${month}-01`
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const start = addDays(first, -offset)
  const days: string[] = []
  for (let index = 0; index < 42; index += 1) days.push(addDays(start, index))
  return days.slice(0, days[35]?.startsWith(month) === true ? 42 : 35)
}

/** Calendrier de l'école (vraie API) : vue mensuelle (liste sur téléphone), événements gérés par la direction. */
export function CalendarPage() {
  const { t } = useTranslation()
  const today = schoolToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const days = monthGrid(month)
  const query = useEvents(days[0] ?? `${month}-01`, days[days.length - 1] ?? `${month}-28`)
  const cycles = useCycles()
  const save = useSaveEvent()
  const remove = useDeleteEvent()
  const empty: SchoolEventInput = {
    title: '',
    kind: 'event',
    startsOn: today,
    endsOn: today,
    cycleId: null,
    location: null,
  }
  const [editing, setEditing] = useState<string | null | undefined>(undefined)
  const [draft, setDraft] = useState<SchoolEventInput>(empty)
  const invalid = draft.endsOn < draft.startsOn
  const open = (event: SchoolEvent | null) => {
    setEditing(event?.id ?? null)
    setDraft(
      event === null
        ? empty
        : {
            title: event.title,
            kind: event.kind,
            startsOn: event.starts_on,
            endsOn: event.ends_on,
            cycleId: event.cycle?.id ?? null,
            location: event.location,
          },
    )
  }

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('calendar.title')}
        description={t('calendar.description')}
        actions={
          <Can permission="school.settings.manage">
            <Button
              variant="accent"
              onClick={() => {
                open(null)
              }}
            >
              <Plus aria-hidden />
              {t('calendar.add')}
            </Button>
          </Can>
        }
      />
      <div className="flex items-center justify-between gap-3">
        <h2
          className="font-display text-xl font-semibold first-letter:uppercase"
          aria-live="polite"
        >
          {formatMonth(month)}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t('calendar.previous')}
            onClick={() => {
              setMonth(shiftMonth(month, -1))
            }}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMonth(today.slice(0, 7))
            }}
          >
            {t('calendar.today')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('calendar.next')}
            onClick={() => {
              setMonth(shiftMonth(month, 1))
            }}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <QueryState query={query}>
        {(events) => {
          const inMonth = events.filter(
            (event) => event.ends_on >= `${month}-01` && event.starts_on <= `${month}-31`,
          )
          return (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <Card className="hidden overflow-hidden p-0 md:block">
                <div
                  className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold text-muted-foreground uppercase"
                  aria-hidden
                >
                  {days.slice(0, 7).map((day) => (
                    <div key={day} className="py-2">
                      {weekday.format(new Date(`${day}T12:00:00Z`)).replace('.', '')}
                    </div>
                  ))}
                </div>
                <ol className="grid grid-cols-7">
                  {days.map((day) => {
                    const dayEvents = events.filter(
                      (event) => event.starts_on <= day && event.ends_on >= day,
                    )
                    const outside = !day.startsWith(month)
                    return (
                      <li
                        key={day}
                        className={cn(
                          'min-h-28 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0',
                          outside && 'bg-muted/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mb-1 grid size-7 place-items-center rounded-full text-xs font-semibold',
                            day === today
                              ? 'bg-accent text-accent-foreground'
                              : outside
                                ? 'text-muted-foreground'
                                : '',
                          )}
                        >
                          {Number(day.slice(8))}
                        </span>
                        <ul className="grid gap-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <li
                              key={event.id}
                              className={cn(
                                'truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                                KIND_TONE[event.kind],
                              )}
                              title={event.title}
                            >
                              {event.title}
                            </li>
                          ))}
                          {dayEvents.length > 3 && (
                            <li className="px-1.5 text-[11px] text-muted-foreground">
                              {t('calendar.more', { count: dayEvents.length - 3 })}
                            </li>
                          )}
                        </ul>
                      </li>
                    )
                  })}
                </ol>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('calendar.upcoming')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {inMonth.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('calendar.none')}</p>
                  ) : (
                    <ul className="grid gap-3">
                      {inMonth.map((event) => (
                        <li key={event.id} className="flex gap-3">
                          <span
                            className={cn(
                              'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center font-display text-sm font-bold',
                              KIND_TONE[event.kind],
                            )}
                          >
                            {formatDayMonth(event.starts_on)}
                          </span>
                          <span className="grid min-w-0 flex-1 gap-1">
                            <span className="font-semibold">{event.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {t(`calendar.kinds.${event.kind}`)}
                              {event.ends_on !== event.starts_on &&
                                ` · ${formatDay(event.starts_on)} → ${formatDay(event.ends_on)}`}
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                              {event.cycle !== null && (
                                <CycleBadge code={event.cycle.code} label={event.cycle.name} />
                              )}
                              {event.location !== null && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin aria-hidden className="size-3" />
                                  {event.location}
                                </span>
                              )}
                            </span>
                          </span>
                          {event.can_manage && (
                            <span className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t('calendar.editEvent', { title: event.title })}
                                onClick={() => {
                                  open(event)
                                }}
                              >
                                <Pencil aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t('calendar.deleteEvent', { title: event.title })}
                                disabled={remove.isPending}
                                onClick={() => {
                                  remove
                                    .mutateAsync(event.id)
                                    .then(() => {
                                      toast(t('calendar.deleted'), { tone: 'success' })
                                    })
                                    .catch(() => {
                                      toast(t('common.error'), { tone: 'error' })
                                    })
                                }}
                              >
                                <Trash2 aria-hidden />
                              </Button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        }}
      </QueryState>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(value) => {
          if (!value) setEditing(undefined)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{editing === null ? t('calendar.add') : t('calendar.edit')}</DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (draft.title.trim().length < 2 || invalid) return
              save
                .mutateAsync({ ...draft, id: editing ?? null, title: draft.title.trim() })
                .then(() => {
                  setEditing(undefined)
                  setMonth(draft.startsOn.slice(0, 7))
                  toast(t('calendar.added'), { tone: 'success' })
                })
                .catch(() => {
                  toast(t('common.error'), { tone: 'error' })
                })
            }}
          >
            <Field label={t('calendar.eventTitle')}>
              {(control) => (
                <Input
                  {...control}
                  required
                  value={draft.title}
                  onChange={(event) => {
                    setDraft({ ...draft, title: event.target.value })
                  }}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('calendar.start')}>
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={draft.startsOn}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        startsOn: event.target.value,
                        endsOn:
                          draft.endsOn < event.target.value ? event.target.value : draft.endsOn,
                      })
                    }}
                  />
                )}
              </Field>
              <Field
                label={t('calendar.end')}
                error={invalid ? t('calendar.endBeforeStart') : undefined}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={draft.endsOn}
                    onChange={(event) => {
                      setDraft({ ...draft, endsOn: event.target.value })
                    }}
                  />
                )}
              </Field>
              <Field label={t('calendar.kind')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={draft.kind}
                    onChange={(event) => {
                      const kind = KINDS.find((candidate) => candidate === event.target.value)
                      if (kind !== undefined) setDraft({ ...draft, kind })
                    }}
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`calendar.kinds.${kind}`)}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label={t('calendar.cycle')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={draft.cycleId ?? ''}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        cycleId: event.target.value === '' ? null : event.target.value,
                      })
                    }}
                  >
                    <option value="">{t('calendar.allCycles')}</option>
                    {(cycles.data ?? []).map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
            </div>
            <Field label={t('calendar.location')}>
              {(control) => (
                <Input
                  {...control}
                  value={draft.location ?? ''}
                  onChange={(event) => {
                    setDraft({
                      ...draft,
                      location: event.target.value === '' ? null : event.target.value,
                    })
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
              <Button
                type="submit"
                disabled={draft.title.trim().length < 2 || invalid || save.isPending}
              >
                {editing === null ? t('common.add') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
