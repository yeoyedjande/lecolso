import { Link } from '@tanstack/react-router'
import { Ban, Mail, MessageSquareText, Phone, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ConflictError } from '@/lib/api/errors'
import { DISPLAY_TIME_ZONE, formatDate, formatDateTime, formatPhone } from '@/lib/format'
import { toast } from '@/lib/toast'

import { ageOf } from '../age'
import {
  PRE_REGISTRATION_STATUSES,
  usePreRegistrations,
  useRefusePreRegistration,
  type PreRegistration,
  type PreRegistrationStatus,
} from '../api'

const TONES: Record<PreRegistrationStatus, 'accent' | 'success' | 'secondary'> = {
  pending: 'accent',
  enrolled: 'success',
  refused: 'secondary',
}

function todayInSchool(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: DISPLAY_TIME_ZONE })
}

function RefuseDialog({
  request,
  onClose,
}: {
  request: PreRegistration | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const refuse = useRefusePreRegistration()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle>{t('preRegistrations.refuseTitle')}</DialogTitle>
        <DialogDescription>
          {request === null
            ? null
            : t('preRegistrations.refuseDescription', {
                reference: request.reference,
                phone: formatPhone(request.guardian.phone),
              })}
        </DialogDescription>
        {error !== null && <FormAlert>{error}</FormAlert>}
        <Field label={t('preRegistrations.refuseReason')} hint={t('preRegistrations.refuseHint')}>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={200}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
              }}
            />
          )}
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={request === null || reason.trim().length < 3 || refuse.isPending}
            onClick={() => {
              if (request === null) return
              setError(null)
              refuse
                .mutateAsync({ id: request.id, reason: reason.trim() })
                .then(() => {
                  setReason('')
                  onClose()
                  toast(t('preRegistrations.refused'), { tone: 'success' })
                })
                .catch((caught: unknown) => {
                  setError(
                    caught instanceof ConflictError
                      ? t('preRegistrations.alreadyDecided')
                      : t('common.error'),
                  )
                })
            }}
          >
            {t('preRegistrations.refuseConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Decision({ request }: { request: PreRegistration }) {
  const { t } = useTranslation()
  if (request.status === 'pending' || request.decided_at === null) return null
  return (
    <div className="grid gap-1 rounded-xl bg-muted/50 p-3 text-sm">
      <p>
        {request.status === 'enrolled'
          ? t('preRegistrations.enrolledBy', {
              date: formatDate(request.decided_at),
              name: request.decided_by_name ?? '',
            })
          : t('preRegistrations.refusedBy', {
              date: formatDate(request.decided_at),
              name: request.decided_by_name ?? '',
              reason: request.decision_note ?? '',
            })}
      </p>
      {request.notification_status === 'sent' && (
        <p className="text-muted-foreground">{t('preRegistrations.smsSent')}</p>
      )}
      {request.notification_status === 'failed' && (
        <p className="text-destructive-ink">
          {t('preRegistrations.smsFailed', { reason: request.notification_failure ?? '' })}
        </p>
      )}
      {request.status === 'enrolled' && request.student_id !== null && (
        <Button asChild variant="link" className="h-auto justify-start p-0">
          <Link
            from="/$school"
            to="/$school/eleves/$studentId"
            params={{ studentId: request.student_id }}
          >
            {t('preRegistrations.openFile')}
          </Link>
        </Button>
      )}
    </div>
  )
}

function RequestCard({
  request,
  today,
  onRefuse,
}: {
  request: PreRegistration
  today: string
  onRefuse: (request: PreRegistration) => void
}) {
  const { t } = useTranslation()
  const name = `${request.child.last_name.toLocaleUpperCase('fr')} ${request.child.first_name}`
  return (
    <li>
      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-0.5">
              <h2 className="font-display text-lg font-semibold">{name}</h2>
              <p className="text-sm text-muted-foreground">
                {t('preRegistrations.received', {
                  reference: request.reference,
                  date: formatDateTime(request.created_at),
                })}
              </p>
            </div>
            <Badge variant={TONES[request.status]}>
              {t(`preRegistrations.status.${request.status}`)}
            </Badge>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t('preRegistrations.level')}</dt>
              <dd className="font-medium">
                {request.level.name} · {request.level.cycle_name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('preRegistrations.birth')}</dt>
              <dd className="font-medium">
                {t('preRegistrations.birthValue', {
                  date: formatDate(request.child.birth_date),
                  age: ageOf(request.child.birth_date, today),
                  gender: t(`preRegistrations.gender.${request.child.gender}`),
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('preRegistrations.guardian')}</dt>
              <dd className="grid gap-0.5 font-medium">
                <span>{request.guardian.name}</span>
                <a
                  href={`tel:${request.guardian.phone}`}
                  className="inline-flex items-center gap-1.5 text-accent-ink underline-offset-4 hover:underline"
                >
                  <Phone aria-hidden className="size-4" />
                  {formatPhone(request.guardian.phone)}
                </a>
                {request.guardian.email !== null && (
                  <a
                    href={`mailto:${request.guardian.email}`}
                    className="inline-flex items-center gap-1.5 break-all text-accent-ink underline-offset-4 hover:underline"
                  >
                    <Mail aria-hidden className="size-4 shrink-0" />
                    {request.guardian.email}
                  </a>
                )}
              </dd>
            </div>
            {request.message !== null && (
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquareText aria-hidden className="size-4" />
                  {t('preRegistrations.message')}
                </dt>
                <dd className="whitespace-pre-line">{request.message}</dd>
              </div>
            )}
          </dl>
          <Decision request={request} />
          {request.status === 'pending' && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="accent">
                <Link
                  from="/$school"
                  to="/$school/inscriptions"
                  search={{ preinscription: request.id }}
                >
                  <UserPlus aria-hidden />
                  {t('preRegistrations.enroll')}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-destructive-ink"
                onClick={() => {
                  onRefuse(request)
                }}
              >
                <Ban aria-hidden />
                {t('preRegistrations.refuse')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  )
}

/**
 * Pré-inscriptions envoyées en ligne par les familles (vraie API) : le secrétariat appelle la famille, puis inscrit
 * l'enfant (inscription pré-remplie) ou refuse la demande avec un motif ; le parent est prévenu par SMS.
 */
export function PreRegistrationsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<PreRegistrationStatus | 'all'>('pending')
  const query = usePreRegistrations(status === 'all' ? null : status)
  const [refusing, setRefusing] = useState<PreRegistration | null>(null)
  const today = todayInSchool()

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('preRegistrations.title')}
        description={t('preRegistrations.description')}
      />
      <Field label={t('preRegistrations.filter')} className="max-w-xs">
        {(control) => (
          <NativeSelect
            {...control}
            value={status}
            onChange={(event) => {
              const value = event.target.value
              const next = PRE_REGISTRATION_STATUSES.find((candidate) => candidate === value)
              setStatus(next ?? 'all')
            }}
          >
            {PRE_REGISTRATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`preRegistrations.filters.${value}`)}
              </option>
            ))}
            <option value="all">{t('preRegistrations.filters.all')}</option>
          </NativeSelect>
        )}
      </Field>
      <QueryState query={query}>
        {(requests) =>
          requests.length === 0 ? (
            <EmptyState
              title={t('preRegistrations.empty')}
              description={t('preRegistrations.emptyDescription')}
            />
          ) : (
            <ul className="grid gap-4" aria-label={t('preRegistrations.title')}>
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  today={today}
                  onRefuse={setRefusing}
                />
              ))}
            </ul>
          )
        }
      </QueryState>
      <RefuseDialog
        request={refusing}
        onClose={() => {
          setRefusing(null)
        }}
      />
    </div>
  )
}
