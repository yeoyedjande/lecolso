import { useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { schoolToday } from '@/features/attendance/status'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useMyChildren, usePlanAbsence } from '../api'

/**
 * Prévenir d'une absence à venir : l'enfant, du … au …, le motif ; l'administration reçoit un message et décide.
 * Deux écrans depuis l'accueil (Justifier une absence → Absence à venir).
 */
export function PlanAbsencePage({ studentId }: { studentId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const children = useMyChildren()
  const today = schoolToday()
  const [childId, setChildId] = useState(studentId ?? '')
  const current = childId === '' ? (children.data?.[0]?.student.id ?? '') : childId
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(today)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const plan = usePlanAbsence()

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('parent.plan.title')}</h1>
        <p className="text-muted-foreground">{t('parent.plan.subtitle')}</p>
      </div>
      {children.isPending ? (
        <ListSkeleton />
      ) : (children.data ?? []).length === 0 ? (
        <EmptyState title={t('parent.home.noChild')} />
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            plan
              .mutateAsync({
                studentId: current,
                startsOn,
                endsOn,
                reason: reason.trim(),
                message: message.trim() === '' ? null : message.trim(),
              })
              .then(() => {
                toast(t('parent.plan.sent'), { tone: 'success' })
                void navigate({
                  from: '/$school',
                  to: '/$school/parent/enfants/$studentId',
                  params: { studentId: current },
                  search: { onglet: 'absences' },
                })
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
          {(children.data ?? []).length > 1 && (
            <Field label={t('parent.justify.child')}>
              {(control) => (
                <NativeSelect
                  {...control}
                  value={current}
                  onChange={(event) => {
                    setChildId(event.target.value)
                  }}
                >
                  {(children.data ?? []).map((candidate) => (
                    <option key={candidate.student.id} value={candidate.student.id}>
                      {candidate.student.full_name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('parent.plan.from')}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  required
                  min={today}
                  value={startsOn}
                  onChange={(event) => {
                    setStartsOn(event.target.value)
                    if (endsOn < event.target.value) setEndsOn(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field label={t('parent.plan.to')}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  required
                  min={startsOn}
                  value={endsOn}
                  onChange={(event) => {
                    setEndsOn(event.target.value)
                  }}
                />
              )}
            </Field>
          </div>
          <Field label={t('parent.justify.reason')}>
            {(control) => (
              <Input
                {...control}
                required
                minLength={3}
                maxLength={300}
                placeholder={t('parent.plan.reasonPlaceholder')}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label={t('parent.plan.message')}>
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                maxLength={1500}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                }}
              />
            )}
          </Field>
          {error !== null && (
            <p className="text-sm text-destructive-ink" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            variant="accent"
            disabled={
              plan.isPending || reason.trim().length < 3 || startsOn === '' || endsOn === ''
            }
          >
            <Send aria-hidden />
            {t('parent.plan.submit')}
          </Button>
        </form>
      )}
    </div>
  )
}
