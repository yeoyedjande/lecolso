import { useNavigate } from '@tanstack/react-router'
import { CalendarCheck2, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DemoBanner } from '@/components/states/DemoBanner'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { demoToday } from '@/lib/demo/dates'
import { formatDay } from '@/lib/format'
import { toast } from '@/lib/toast'

import { useAbsencesToJustify, useJustifyAbsence, useMyChildren } from '../api'
import { isDay, JUSTIFY_REASONS, type JustifyReason } from '../demo'

/** Justification d'absence : un formulaire, puis retour à l'accueil (3 écrans au plus). */
export function JustifyPage({
  studentId,
  date,
}: {
  studentId: string | undefined
  date: string | undefined
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const children = useMyChildren()
  const pending = useAbsencesToJustify()
  const justify = useJustifyAbsence()
  const today = demoToday()
  const [child, setChild] = useState(studentId ?? '')
  const [from, setFrom] = useState(date ?? today)
  const [to, setTo] = useState(date ?? today)
  const [reason, setReason] = useState<JustifyReason>('illness')
  const [comment, setComment] = useState('')
  // Dates vides ou incomplètes refusées avant tout envoi
  const invalid = !isDay(from) || !isDay(to) || to < from

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">{t('parent.justify.title')}</h1>
        <p className="text-muted-foreground">{t('parent.justify.subtitle')}</p>
      </div>

      <QueryState query={pending}>
        {(list) =>
          list.length > 0 && (
            <section aria-labelledby="pending-title" className="grid gap-2">
              <h2 id="pending-title" className="text-sm font-semibold">
                {t('parent.justify.pending')}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {list.slice(0, 6).map((entry) => (
                  <li key={`${entry.student.id}-${entry.date}`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setChild(entry.student.id)
                        setFrom(entry.date)
                        setTo(entry.date)
                      }}
                    >
                      <CalendarCheck2 aria-hidden />
                      {`${entry.student.firstName} · ${formatDay(entry.date)}`}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )
        }
      </QueryState>

      <QueryState query={children}>
        {(list) => {
          const selected = list.find((candidate) => candidate.student.id === child) ?? list[0]
          return (
            <Card>
              <CardContent className="p-4">
                <form
                  noValidate
                  className="grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (selected === undefined || invalid) return
                    void justify
                      .mutateAsync({
                        studentId: selected.student.id,
                        from,
                        to,
                        reason,
                        comment: comment.trim(),
                      })
                      .then((count) => {
                        toast(t('parent.justify.success', { count }), { tone: 'success' })
                        void navigate({ to: '/parent' })
                      })
                  }}
                >
                  <Field label={t('parent.justify.child')}>
                    {(control) => (
                      <NativeSelect
                        {...control}
                        value={selected?.student.id ?? ''}
                        onChange={(event) => {
                          setChild(event.target.value)
                        }}
                      >
                        {list.map((candidate) => (
                          <option key={candidate.student.id} value={candidate.student.id}>
                            {candidate.student.firstName}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('parent.justify.from')}>
                      {(control) => (
                        <Input
                          {...control}
                          type="date"
                          value={from}
                          onChange={(event) => {
                            setFrom(event.target.value)
                            if (event.target.value > to) setTo(event.target.value)
                          }}
                        />
                      )}
                    </Field>
                    <Field
                      label={t('parent.justify.to')}
                      error={invalid ? t('parent.justify.errors.dates') : undefined}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          type="date"
                          value={to}
                          onChange={(event) => {
                            setTo(event.target.value)
                          }}
                        />
                      )}
                    </Field>
                  </div>
                  <Field label={t('parent.justify.reason')}>
                    {(control) => (
                      <NativeSelect
                        {...control}
                        value={reason}
                        onChange={(event) => {
                          const value = JUSTIFY_REASONS.find(
                            (candidate) => candidate === event.target.value,
                          )
                          if (value !== undefined) setReason(value)
                        }}
                      >
                        {JUSTIFY_REASONS.map((candidate) => (
                          <option key={candidate} value={candidate}>
                            {t(`parent.justify.reasons.${candidate}`)}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </Field>
                  <Field label={t('parent.justify.comment')}>
                    {(control) => (
                      <Textarea
                        {...control}
                        rows={3}
                        value={comment}
                        onChange={(event) => {
                          setComment(event.target.value)
                        }}
                      />
                    )}
                  </Field>
                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    disabled={invalid || justify.isPending}
                  >
                    <Send aria-hidden />
                    {t('parent.justify.submit')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        }}
      </QueryState>
    </div>
  )
}
