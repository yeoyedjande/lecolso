import { CheckCheck, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatDateTime, formatTime } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useSaveRollCall, type MarkStatus, type RollCall } from '../api'
import { justificationKey } from '../status'

const CHOICES: { status: MarkStatus; tone: string }[] = [
  {
    status: 'present',
    tone: 'data-[on=true]:bg-[#15803d] data-[on=true]:text-white data-[on=true]:border-[#15803d]',
  },
  {
    status: 'absent',
    tone: 'data-[on=true]:bg-[#b91c1c] data-[on=true]:text-white data-[on=true]:border-[#b91c1c]',
  },
  {
    status: 'late',
    tone: 'data-[on=true]:bg-accent data-[on=true]:text-accent-foreground data-[on=true]:border-accent',
  },
]

function markStatus(value: string): MarkStatus {
  return value === 'absent' || value === 'late' ? value : 'present'
}

/**
 * Appel en deux gestes : tout le monde est présent par défaut, un toucher marque un absent ou un retard, puis
 * « Enregistrer ». Hors connexion, l'appel est gardé sur l'appareil et envoyé au retour du réseau. Journée passée :
 * correction par la direction avec un motif. Cibles de 44 px, utilisable au téléphone.
 */
export function RollCallPanel({ call, onSaved }: { call: RollCall; onSaved?: () => void }) {
  const { t } = useTranslation()
  const save = useSaveRollCall()
  const editable = call.can_edit
  const [statuses, setStatuses] = useState<Record<string, MarkStatus>>(() =>
    Object.fromEntries(call.rows.map((row) => [row.student.id, markStatus(row.status)])),
  )
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const values = Object.values(statuses)
  const absent = values.filter((status) => status === 'absent').length
  const late = values.filter((status) => status === 'late').length

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            'text-sm',
            call.taken === null ? 'font-semibold text-accent-ink' : 'text-muted-foreground',
          )}
        >
          {call.taken === null
            ? t('attendance.notTaken')
            : t('attendance.taken', { by: call.taken.by, time: formatTime(call.taken.at) })}
        </p>
        <p className="text-sm font-semibold" aria-live="polite">
          {t('attendance.summary', { present: values.length - absent - late, absent, late })}
        </p>
      </div>
      {call.needs_reason && (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm">
          {editable ? t('attendance.correctionHint') : t('attendance.dayClosed')}
        </p>
      )}
      {call.corrections.length > 0 && (
        <ul className="grid gap-1 text-sm text-muted-foreground">
          {call.corrections.map((correction) => (
            <li key={correction.at}>
              {t('attendance.correctedBy', {
                name: correction.by,
                date: formatDateTime(correction.at),
                reason: correction.reason,
              })}
            </li>
          ))}
        </ul>
      )}
      {call.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('attendance.noStudent')}</p>
      ) : (
        editable && (
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={() => {
              setStatuses(Object.fromEntries(call.rows.map((row) => [row.student.id, 'present'])))
            }}
          >
            <CheckCheck aria-hidden />
            {t('attendance.allPresent')}
          </Button>
        )
      )}
      <ul className="grid gap-2 lg:grid-cols-2">
        {call.rows.map((row) => {
          const current = statuses[row.student.id] ?? 'present'
          return (
            <li key={row.student.id}>
              <Card
                className={cn(
                  'transition',
                  current === 'absent' && 'border-destructive/50',
                  current === 'late' && 'border-accent/60',
                )}
              >
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <Avatar name={row.student.full_name} photoUrl={row.student.photo_url} size="sm" />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{row.student.full_name}</span>
                    {row.justification !== null && (
                      <Badge
                        variant={row.justification.status === 'accepted' ? 'success' : 'outline'}
                        className="mt-1 w-fit"
                      >
                        {t(
                          `attendance.justification.${justificationKey(row.justification.status)}`,
                        )}
                      </Badge>
                    )}
                  </span>
                  <div
                    role="group"
                    aria-label={row.student.full_name}
                    className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto"
                  >
                    {CHOICES.map((choice) => (
                      <button
                        key={choice.status}
                        type="button"
                        disabled={!editable}
                        data-on={current === choice.status}
                        aria-pressed={current === choice.status}
                        aria-label={t('attendance.statusFor', {
                          status: t(`attendanceStatus.${choice.status}`),
                          name: row.student.full_name,
                        })}
                        className={cn(
                          'min-h-11 min-w-11 rounded-xl border bg-surface px-3 text-sm font-semibold transition disabled:opacity-60',
                          choice.tone,
                        )}
                        onClick={() => {
                          setStatuses((previous) => ({
                            ...previous,
                            [row.student.id]: choice.status,
                          }))
                        }}
                      >
                        {t(`attendanceShort.${choice.status}`)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
      {editable && call.needs_reason && (
        <Field label={t('attendance.reason')} hint={t('attendance.reasonHint')}>
          {(control) => (
            <Input
              {...control}
              value={reason}
              maxLength={200}
              onChange={(event) => {
                setReason(event.target.value)
              }}
            />
          )}
        </Field>
      )}
      {error !== null && <FormAlert>{error}</FormAlert>}
      {editable && call.rows.length > 0 && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button
            size="lg"
            variant="accent"
            className="shadow-lift"
            disabled={save.isPending || (call.needs_reason && reason.trim().length < 3)}
            onClick={() => {
              setError(null)
              save
                .mutateAsync({
                  classroomId: call.classroom.id,
                  date: call.date,
                  reason: call.needs_reason ? reason.trim() : null,
                  marks: Object.entries(statuses).map(([studentId, status]) => ({
                    student_id: studentId,
                    status,
                    late_minutes: null,
                  })),
                })
                .then(({ queued }) => {
                  toast(queued ? t('attendance.queued') : t('attendance.saved', { absent }), {
                    tone: 'success',
                  })
                  onSaved?.()
                })
                .catch((caught: unknown) => {
                  setError(
                    caught instanceof ConflictError
                      ? caught.message
                      : caught instanceof ValidationError
                        ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
                        : t('common.error'),
                  )
                })
            }}
          >
            <Save aria-hidden />
            {t(save.isPending ? 'attendance.saving' : 'attendance.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
