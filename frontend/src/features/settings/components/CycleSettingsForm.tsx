import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useUpdateCycle, type Cycle, type CycleSettings } from '@/features/cycles/api'
import { toast } from '@/lib/toast'

const OPTIONS: { [K in keyof CycleSettings]: readonly CycleSettings[K][] } = {
  term_type: ['trimester', 'semester', 'free_period'],
  assessment_mode: ['observation', 'competency', 'weighted_average'],
  attendance_mode: ['roll_call', 'check_in_out'],
  billing_period: ['monthly', 'quarterly', 'yearly'],
  report_document: ['none', 'skills_booklet', 'report_card'],
  daily_log: ['none', 'optional', 'required'],
}

/** Paramètres d'un cycle (vraie API PATCH /cycles/{cycle}) ; lecture seule sans le droit de gestion sur ce cycle. */
export function CycleSettingsForm({ cycle, editable }: { cycle: Cycle; editable: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateCycle()
  const [name, setName] = useState(cycle.name)
  const [settings, setSettings] = useState<CycleSettings>(cycle.settings)

  const labels: { [K in keyof CycleSettings]: [string, Record<CycleSettings[K], string>] } = {
    term_type: [
      t('settings.cycles.termType'),
      {
        trimester: t('settings.cycles.termTypes.trimester'),
        semester: t('settings.cycles.termTypes.semester'),
        free_period: t('settings.cycles.termTypes.free_period'),
      },
    ],
    assessment_mode: [
      t('settings.cycles.assessmentMode'),
      {
        observation: t('settings.cycles.assessmentModes.observation'),
        competency: t('settings.cycles.assessmentModes.competency'),
        weighted_average: t('settings.cycles.assessmentModes.weighted_average'),
      },
    ],
    attendance_mode: [
      t('settings.cycles.attendanceMode'),
      {
        roll_call: t('settings.cycles.attendanceModes.roll_call'),
        check_in_out: t('settings.cycles.attendanceModes.check_in_out'),
      },
    ],
    billing_period: [
      t('settings.cycles.billingPeriod'),
      {
        monthly: t('settings.cycles.billingPeriods.monthly'),
        quarterly: t('settings.cycles.billingPeriods.quarterly'),
        yearly: t('settings.cycles.billingPeriods.yearly'),
      },
    ],
    report_document: [
      t('settings.cycles.reportDocument'),
      {
        none: t('settings.cycles.reportDocuments.none'),
        skills_booklet: t('settings.cycles.reportDocuments.skills_booklet'),
        report_card: t('settings.cycles.reportDocuments.report_card'),
      },
    ],
    daily_log: [
      t('settings.cycles.dailyLog'),
      {
        none: t('settings.cycles.dailyLogs.none'),
        optional: t('settings.cycles.dailyLogs.optional'),
        required: t('settings.cycles.dailyLogs.required'),
      },
    ],
  }

  const select = (key: keyof CycleSettings, apply: (value: string) => CycleSettings | null) => {
    const [label, values] = labels[key]
    const entries: [string, string][] = Object.entries(values)
    return (
      <Field key={key} label={label}>
        {(control) => (
          <NativeSelect
            {...control}
            disabled={!editable}
            value={settings[key]}
            onChange={(event) => {
              const next = apply(event.target.value)
              if (next !== null) setSettings(next)
            }}
          >
            {entries.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
    )
  }

  /** Nouvelle valeur d'un paramètre, si elle fait partie des valeurs permises. */
  const withValue =
    <K extends keyof CycleSettings>(key: K, list: readonly CycleSettings[K][]) =>
    (value: string) => {
      const found = list.find((candidate) => candidate === value)
      return found === undefined ? null : { ...settings, [key]: found }
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {cycle.name}
          <CycleBadge
            code={cycle.code}
            label={t('settings.cycles.levels', {
              levels: cycle.levels.map((level) => level.name).join(', '),
            })}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            void update
              .mutateAsync({ id: cycle.id, input: { name: name.trim(), settings } })
              .then((saved) => {
                toast(t('settings.cycles.saved', { name: saved.name }), { tone: 'success' })
              })
              .catch(() => {
                toast(t('settings.cycles.failed'), { tone: 'error' })
              })
          }}
        >
          <Field label={t('settings.cycles.name')}>
            {(control) => (
              <Input
                {...control}
                disabled={!editable}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                }}
              />
            )}
          </Field>
          {select('term_type', withValue('term_type', OPTIONS.term_type))}
          {select('assessment_mode', withValue('assessment_mode', OPTIONS.assessment_mode))}
          {select('attendance_mode', withValue('attendance_mode', OPTIONS.attendance_mode))}
          {select('billing_period', withValue('billing_period', OPTIONS.billing_period))}
          {select('report_document', withValue('report_document', OPTIONS.report_document))}
          {select('daily_log', withValue('daily_log', OPTIONS.daily_log))}
          <div className="flex items-end justify-end md:col-span-2 xl:col-span-3">
            {editable ? (
              <Button type="submit" disabled={update.isPending || name.trim() === ''}>
                <Save aria-hidden />
                {t('settings.cycles.save')}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t('settings.cycles.forbidden')}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
