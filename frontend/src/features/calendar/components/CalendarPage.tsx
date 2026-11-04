import { ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react'
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
import { addDays, demoToday } from '@/lib/demo/dates'
import type { CycleCode, DemoEvent, EventKind } from '@/lib/demo/types'
import { formatDay, formatDayMonth, formatMonth } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useAddEvent, useEvents } from '../api'

const KINDS: EventKind[] = ['holiday', 'exam', 'meeting', 'event', 'training']
const KIND_TONE: Record<EventKind, string> = {
  holiday: 'bg-success-soft text-success-ink',
  exam: 'bg-destructive-soft text-destructive-ink',
  meeting: 'bg-navy-100 text-navy dark:bg-white/10 dark:text-foreground',
  event: 'bg-orange-100 text-accent-ink dark:bg-orange/15',
  training: 'bg-muted text-foreground',
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

/** Calendrier de l'école : vue mensuelle (liste sur téléphone) et ajout d'événements. */
export function CalendarPage() {
  const { t } = useTranslation()
  const today = demoToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const days = monthGrid(month)
  const query = useEvents(days[0] ?? `${month}-01`, days[days.length - 1] ?? `${month}-28`)
  const addEvent = useAddEvent()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<DemoEvent, 'id'>>({
    title: '',
    kind: 'event',
    start: today,
    end: today,
    cycle: null,
    location: null,
  })
  const invalid = draft.end < draft.start

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('calendar.title')}
        description={t('calendar.description')}
        actions={
          <Can permission="school.settings.view">
            <Button
              variant="accent"
              onClick={() => {
                setAdding(true)
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
            (event) => event.end >= `${month}-01` && event.start <= `${month}-31`,
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
                      (event) => event.start <= day && event.end >= day,
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
                            {formatDayMonth(event.start)}
                          </span>
                          <span className="grid gap-1">
                            <span className="font-semibold">{event.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {t(`calendar.kinds.${event.kind}`)}
                              {event.end !== event.start &&
                                ` · ${formatDay(event.start)} → ${formatDay(event.end)}`}
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                              {event.cycle !== null && (
                                <CycleBadge code={event.cycle} label={t(`cycles.${event.cycle}`)} />
                              )}
                              {event.location !== null && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin aria-hidden className="size-3" />
                                  {event.location}
                                </span>
                              )}
                            </span>
                          </span>
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
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{t('calendar.add')}</DialogTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (draft.title.trim() === '' || invalid) return
              void addEvent.mutateAsync({ ...draft, title: draft.title.trim() }).then(() => {
                setAdding(false)
                setMonth(draft.start.slice(0, 7))
                toast(t('calendar.added'), { tone: 'success' })
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
                    value={draft.start}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        start: event.target.value,
                        end: draft.end < event.target.value ? event.target.value : draft.end,
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
                    value={draft.end}
                    onChange={(event) => {
                      setDraft({ ...draft, end: event.target.value })
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
                    value={draft.cycle ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      const cycle: CycleCode | null =
                        value === 'daycare' || value === 'kindergarten' || value === 'primary'
                          ? value
                          : null
                      setDraft({ ...draft, cycle })
                    }}
                  >
                    <option value="">{t('calendar.allCycles')}</option>
                    <option value="daycare">{t('cycles.daycare')}</option>
                    <option value="kindergarten">{t('cycles.kindergarten')}</option>
                    <option value="primary">{t('cycles.primary')}</option>
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
                disabled={draft.title.trim() === '' || invalid || addEvent.isPending}
              >
                {t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
