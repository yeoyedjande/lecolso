import { CalendarDays, Pencil, ReceiptText, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatDay } from '@/lib/format'
import { toast } from '@/lib/toast'

import { parseAmountOrZero } from '../amount'
import {
  useBillingGrid,
  useFinancialPolicy,
  useGenerateInvoices,
  useSaveCalendar,
  useSaveFeeGrid,
  useSaveFinancialPolicy,
  type BillingGrid,
  type FeeType,
} from '../api'

type GridCycle = BillingGrid['cycles'][number]

const PERIODS = ['monthly', 'quarterly', 'yearly'] as const
type GridLevel = GridCycle['levels'][number]

interface Editing {
  level: GridLevel
  type: FeeType
  amount: number
}

function amountOf(level: GridLevel, type: FeeType): number {
  return level.amounts.find((entry) => entry.fee_type_id === type.id)?.amount ?? 0
}

/** Calendrier des échéances d'un cycle : dates et libellés modifiables, en nombre fixé par sa périodicité. */
function CalendarEditor({ cycle, editable }: { cycle: GridCycle; editable: boolean }) {
  const { t } = useTranslation()
  const save = useSaveCalendar()
  const [dates, setDates] = useState(cycle.dates.map(({ due_on, label }) => ({ due_on, label })))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dirty = dates.some((date, index) => {
    const original = cycle.dates[index]
    return date.due_on !== original?.due_on || date.label !== original.label
  })

  const submit = async () => {
    setErrors({})
    try {
      await save.mutateAsync({ cycleId: cycle.id, dates })
      toast(t('billing.fees.calendarSaved', { cycle: cycle.name }), { tone: 'success' })
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(
          Object.fromEntries(
            Object.entries(error.fields).map(([field, messages]) => [field, messages[0] ?? '']),
          ),
        )
      } else {
        toast(t('common.error'), { tone: 'error' })
      }
    }
  }

  if (!editable) {
    return (
      <ol className="grid gap-1 text-sm">
        {cycle.dates.map((date) => (
          <li key={date.position} className="flex gap-2">
            <span className="w-24 tabular text-muted-foreground">{formatDay(date.due_on)}</span>
            <span>{date.label}</span>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className="grid gap-3">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dates.map((date, index) => (
          <li key={index} className="grid grid-cols-[minmax(0,1fr)_9.5rem] gap-2">
            <Field
              label={t('billing.fees.dateLabel', { index: index + 1 })}
              error={errors[`dates.${String(index)}.label`]}
            >
              {(control) => (
                <Input
                  {...control}
                  value={date.label}
                  maxLength={60}
                  onChange={(event) => {
                    setDates((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }}
                />
              )}
            </Field>
            <Field
              label={t('billing.fees.dueOn', { index: index + 1 })}
              error={errors[`dates.${String(index)}.due_on`]}
            >
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={date.due_on}
                  onChange={(event) => {
                    setDates((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, due_on: event.target.value } : item,
                      ),
                    )
                  }}
                />
              )}
            </Field>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={!dirty || save.isPending}
        onClick={() => void submit()}
      >
        <Save aria-hidden />
        {t('billing.fees.saveCalendar', { cycle: cycle.name })}
      </Button>
    </div>
  )
}

function FeesGrid({ grid }: { grid: BillingGrid }) {
  const { t } = useTranslation()
  const save = useSaveFeeGrid()
  const generate = useGenerateInvoices()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const amount = parseAmountOrZero(text)
  const manageable = grid.cycles.some((cycle) => cycle.can_manage)
  const closed = grid.academic_year.status === 'closed'

  const confirm = async () => {
    if (editing === null || amount === null) return
    setError(null)
    try {
      await save.mutateAsync([{ level_id: editing.level.id, fee_type_id: editing.type.id, amount }])
      toast(t('billing.fees.saved'), { tone: 'success' })
      setEditing(null)
    } catch (caught) {
      setError(
        caught instanceof ConflictError
          ? t('billing.fees.yearClosed')
          : caught instanceof ValidationError
            ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
            : t('common.error'),
      )
    }
  }

  const invoice = async () => {
    try {
      const created = await generate.mutateAsync()
      toast(t('billing.fees.generated', { count: created }), { tone: 'success' })
    } catch {
      toast(t('common.error'), { tone: 'error' })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {manageable && grid.pending_invoices > 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            <ReceiptText aria-hidden className="size-6 text-accent-ink" />
            <p className="min-w-0 flex-1 text-sm">
              {t('billing.fees.pending', { count: grid.pending_invoices })}
            </p>
            <Button variant="accent" disabled={generate.isPending} onClick={() => void invoice()}>
              {t('billing.fees.generate', { count: grid.pending_invoices })}
            </Button>
          </CardContent>
        </Card>
      )}

      {grid.cycles.map((cycle) => {
        const editable = cycle.can_manage && !closed
        return (
          <section
            key={cycle.id}
            aria-labelledby={`cycle-${cycle.id}`}
            className="grid grid-cols-1 gap-3"
          >
            <h2
              id={`cycle-${cycle.id}`}
              className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold"
            >
              <CycleBadge code={cycle.code} label={cycle.name} />
              <span className="text-sm font-normal text-muted-foreground">
                {t('billing.fees.period', {
                  period: t(
                    `settings.cycles.billingPeriods.${PERIODS.find((period) => period === cycle.billing_period) ?? 'yearly'}`,
                  ),
                  count: cycle.dates.length,
                })}
              </span>
            </h2>
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('billing.fees.level')}</TableHead>
                    {grid.fee_types.map((type) => (
                      <TableHead key={type.id} className="text-right">
                        <span className="grid justify-items-end">
                          <span>{type.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {type.is_optional ? `${t('billing.fees.optional')} · ` : ''}
                            {type.billing === 'once'
                              ? t('billing.fees.once')
                              : t('billing.fees.recurring')}
                          </span>
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycle.levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      {grid.fee_types.map((type) => {
                        const value = amountOf(level, type)
                        return (
                          <TableCell key={type.id} className="text-right">
                            <span className="inline-flex items-center gap-1">
                              {value === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <MoneyAmount value={value} className="font-semibold" />
                              )}
                              {editable && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t('billing.fees.edit', {
                                    kind: type.name,
                                    level: level.name,
                                  })}
                                  onClick={() => {
                                    setEditing({ level, type, amount: value })
                                    setText(value === 0 ? '' : String(value))
                                    setError(null)
                                  }}
                                >
                                  <Pencil aria-hidden />
                                </Button>
                              )}
                            </span>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays aria-hidden className="size-5 text-muted-foreground" />
                  {t('billing.fees.calendar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarEditor
                  key={cycle.dates.map((date) => date.due_on + date.label).join('|')}
                  cycle={cycle}
                  editable={editable}
                />
              </CardContent>
            </Card>
          </section>
        )
      })}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {editing !== null &&
              t('billing.fees.editTitle', { kind: editing.type.name, level: editing.level.name })}
          </DialogTitle>
          <DialogDescription>{t('billing.fees.editHint')}</DialogDescription>
          {error !== null && <FormAlert>{error}</FormAlert>}
          <Field
            label={t('billing.fees.amount')}
            error={text !== '' && amount === null ? t('billing.fees.invalid') : undefined}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                autoComplete="off"
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
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
              disabled={amount === null || save.isPending}
              onClick={() => void confirm()}
            >
              <Save aria-hidden />
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Politique de départ de l'école : modifiable par la direction de toute l'école (school.settings.manage). */
function DeparturePolicyCard() {
  const { t } = useTranslation()
  const membership = useCurrentSchool()
  const policy = useFinancialPolicy()
  const save = useSaveFinancialPolicy()
  const editable = membership !== null && membership.permissions['school.settings.manage'] === null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('billing.fees.policy.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('billing.fees.policy.description')}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <QueryState query={policy}>
          {(current) => (
            <fieldset className="grid gap-2" disabled={!editable || save.isPending}>
              <legend className="sr-only">{t('billing.fees.policy.title')}</legend>
              {(['cancel_unstarted', 'keep_all'] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3 text-sm font-medium has-[:checked]:border-accent has-[:disabled]:cursor-default has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/20"
                >
                  <input
                    type="radio"
                    name="departure-policy"
                    value={value}
                    checked={current.departure === value}
                    onChange={() => {
                      save
                        .mutateAsync(value)
                        .then(() => {
                          toast(t('billing.fees.policy.saved'), { tone: 'success' })
                        })
                        .catch(() => {
                          toast(t('common.error'), { tone: 'error' })
                        })
                    }}
                    className="size-4 accent-accent"
                  />
                  {t(`billing.fees.policy.${value}`)}
                </label>
              ))}
            </fieldset>
          )}
        </QueryState>
        {!editable && (
          <p className="text-sm text-muted-foreground">{t('billing.fees.policy.readOnly')}</p>
        )}
      </CardContent>
    </Card>
  )
}

/** Grille de frais de l'année (vraie API) : montants annuels par niveau, calendrier des échéances de chaque cycle. */
export function FeesPage() {
  const { t } = useTranslation()
  const query = useBillingGrid()

  return (
    <div className="grid grid-cols-1 gap-6">
      <ScreenHeader
        title={t('billing.fees.title')}
        description={
          query.data === undefined
            ? t('billing.fees.descriptionNoYear')
            : t('billing.fees.description', { year: query.data.academic_year.label })
        }
        demo={false}
      />
      {query.data?.academic_year.status === 'closed' && (
        <Badge variant="outline" className="justify-self-start">
          {t('billing.fees.yearClosed')}
        </Badge>
      )}
      <QueryState query={query}>{(grid) => <FeesGrid grid={grid} />}</QueryState>
      <DeparturePolicyCard />
    </div>
  )
}
