import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ValidationError } from '@/lib/api/errors'
import { formatDate } from '@/lib/format'
import { toast } from '@/lib/toast'

import { useAcademicYears, useSaveAcademicYear, type AcademicYear } from '../api'

const DATE = /^\d{4}-\d{2}-\d{2}$/

const schema = z
  .object({
    label: z.string().check(
      z.trim(),
      z.refine((value) => {
        const match = /^(\d{4})-(\d{4})$/.exec(value)
        return match !== null && Number(match[2]) === Number(match[1]) + 1
      }, 'label'),
    ),
    starts_on: z.string().check(z.regex(DATE, 'date')),
    ends_on: z.string().check(z.regex(DATE, 'date')),
    is_current: z.boolean(),
  })
  .check(
    z.refine((values) => !DATE.test(values.ends_on) || values.ends_on > values.starts_on, {
      message: 'order',
      path: ['ends_on'],
    }),
  )

type Values = z.infer<typeof schema>
const SERVER_FIELDS = ['label', 'starts_on', 'ends_on'] as const

/** Proposition pour la prochaine année : celle qui suit la plus récente (rentrée en septembre). */
function nextYearDefaults(years: AcademicYear[]): Values {
  const latest = years.reduce<number | null>((max, year) => {
    const first = Number(year.label.slice(0, 4))
    return max === null || first > max ? first : max
  }, null)
  const start = latest === null ? new Date().getFullYear() : latest + 1
  return {
    label: `${String(start)}-${String(start + 1)}`,
    starts_on: `${String(start)}-09-01`,
    ends_on: `${String(start + 1)}-07-15`,
    is_current: years.length === 0,
  }
}

/** Onglet « Années scolaires » des paramètres (vraie API) : liste, année en cours, clôture, création. */
export function AcademicYearsPanel({ editable }: { editable: boolean }) {
  const { t } = useTranslation()
  const years = useAcademicYears()

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t('academicYears.description')}</p>
      {!editable && <p className="text-sm text-muted-foreground">{t('academicYears.readOnly')}</p>}
      <QueryState query={years}>
        {(list) => (
          <div className="grid gap-4">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('academicYears.empty')}</p>
            ) : (
              <ul className="grid gap-3" aria-label={t('academicYears.title')}>
                {list.map((year) => (
                  <YearRow key={year.id} year={year} editable={editable} />
                ))}
              </ul>
            )}
            {editable && <CreateYearForm key={list.length} years={list} />}
          </div>
        )}
      </QueryState>
    </div>
  )
}

function YearRow({ year, editable }: { year: AcademicYear; editable: boolean }) {
  const { t } = useTranslation()
  const save = useSaveAcademicYear()

  const change = async (patch: Pick<AcademicYear, 'status'> | { is_current: true }) => {
    try {
      await save.mutateAsync({
        id: year.id,
        input: {
          label: year.label,
          starts_on: year.starts_on,
          ends_on: year.ends_on,
          ...patch,
        },
      })
      const key =
        'is_current' in patch
          ? 'academicYears.madeCurrent'
          : patch.status === 'closed'
            ? 'academicYears.closedDone'
            : 'academicYears.reopened'
      toast(t(key, { label: year.label }), { tone: 'success' })
    } catch {
      toast(t('academicYears.failed'), { tone: 'error' })
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border bg-surface px-4 py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold">{year.label}</span>
          {year.is_current && <Badge variant="success">{t('academicYears.current')}</Badge>}
          <Badge variant={year.status === 'open' ? 'secondary' : 'outline'}>
            {year.status === 'open' ? t('academicYears.open') : t('academicYears.closed')}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {t('academicYears.dates', {
            start: formatDate(year.starts_on),
            end: formatDate(year.ends_on),
          })}
        </span>
      </div>
      {editable && (
        <div className="flex flex-wrap gap-2">
          {!year.is_current && year.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              disabled={save.isPending}
              onClick={() => void change({ is_current: true })}
            >
              {t('academicYears.makeCurrent')}
            </Button>
          )}
          {year.status === 'open' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={save.isPending || year.is_current}
              title={year.is_current ? t('academicYears.currentLocked') : undefined}
              onClick={() => void change({ status: 'closed' })}
            >
              {t('academicYears.close')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={save.isPending}
              onClick={() => void change({ status: 'open' })}
            >
              {t('academicYears.reopen')}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function CreateYearForm({ years }: { years: AcademicYear[] }) {
  const { t } = useTranslation()
  const save = useSaveAcademicYear()
  const [failed, setFailed] = useState(false)
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: nextYearDefaults(years) })

  const message = (field: keyof Values): string | undefined => {
    const error = errors[field]
    if (error?.message === undefined) return undefined
    if (error.type === 'server') return error.message
    switch (error.message) {
      case 'label':
      case 'date':
      case 'order':
        return t(`academicYears.errors.${error.message}`)
      default:
        return error.message
    }
  }

  const submit = handleSubmit(async (values) => {
    setFailed(false)
    try {
      const saved = await save.mutateAsync({
        id: null,
        input: { ...values, label: values.label.trim() },
      })
      toast(t('academicYears.created', { label: saved.label }), { tone: 'success' })
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const field of SERVER_FIELDS) {
        const text = error.fields[field]?.[0]
        if (text !== undefined) setError(field, { type: 'server', message: text })
      }
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('academicYears.createTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
          {failed && <FormAlert>{t('academicYears.failed')}</FormAlert>}
          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label={t('academicYears.label')}
              hint={t('academicYears.labelHint')}
              error={message('label')}
            >
              {(field) => <Input {...field} {...register('label')} autoComplete="off" />}
            </Field>
            <Field label={t('academicYears.startsOn')} error={message('starts_on')}>
              {(field) => <Input {...field} {...register('starts_on')} type="date" />}
            </Field>
            <Field label={t('academicYears.endsOn')} error={message('ends_on')}>
              {(field) => <Input {...field} {...register('ends_on')} type="date" />}
            </Field>
          </div>
          <Controller
            control={control}
            name="is_current"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="year-is-current"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true)
                  }}
                />
                <Label htmlFor="year-is-current">{t('academicYears.setCurrent')}</Label>
              </div>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              <CalendarPlus aria-hidden />
              {t('academicYears.create')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
