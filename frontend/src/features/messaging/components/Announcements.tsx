import { Megaphone, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/format'
import { toast } from '@/lib/toast'

import {
  useAnnouncements,
  useAnnouncementTargets,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  type Announcement,
} from '../api'

/** Valeur du choix du public : « school », « cycle:<id> » ou « classroom:<id> ». */
function parseTarget(value: string) {
  if (value.startsWith('cycle:'))
    return { audience: 'cycle' as const, cycleId: value.slice(6), classroomId: null }
  if (value.startsWith('classroom:'))
    return { audience: 'classroom' as const, cycleId: null, classroomId: value.slice(10) }
  return { audience: 'school' as const, cycleId: null, classroomId: null }
}

/** Publier une annonce : publics permis à l'utilisateur ; SMS proposé mais pas encore disponible (lot 10). */
export function AnnouncementForm({ onPublished }: { onPublished?: () => void }) {
  const { t } = useTranslation()
  const targets = useAnnouncementTargets()
  const publish = usePublishAnnouncement()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('')
  const options = targets.data
  if (options === undefined) return null
  const values = [
    ...(options.school ? ['school'] : []),
    ...options.cycles.map((cycle) => `cycle:${cycle.id}`),
    ...options.classrooms.map((classroom) => `classroom:${classroom.id}`),
  ]
  if (values.length === 0) return null
  const current = values.includes(target) ? target : (values[0] ?? 'school')

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        publish
          .mutateAsync({ title: title.trim(), body: body.trim(), ...parseTarget(current) })
          .then((created) => {
            toast(t('messaging.published', { count: created.reach }), { tone: 'success' })
            setTitle('')
            setBody('')
            onPublished?.()
          })
          .catch(() => {
            toast(t('common.error'), { tone: 'error' })
          })
      }}
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Megaphone aria-hidden className="size-5 text-accent-ink" />
        {t('messaging.new')}
      </h2>
      <Field label={t('messaging.announcementTitle')}>
        {(control) => (
          <Input
            {...control}
            required
            maxLength={120}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
        )}
      </Field>
      <Field
        label={t('messaging.announcementBody')}
        hint={t('messaging.chars', { count: body.length })}
      >
        {(control) => (
          <Textarea
            {...control}
            required
            rows={4}
            maxLength={2000}
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
            }}
          />
        )}
      </Field>
      <Field label={t('messaging.audience')}>
        {(control) => (
          <NativeSelect
            {...control}
            value={current}
            onChange={(event) => {
              setTarget(event.target.value)
            }}
          >
            {options.school && <option value="school">{t('messaging.audiences.all')}</option>}
            {options.cycles.map((cycle) => (
              <option key={cycle.id} value={`cycle:${cycle.id}`}>
                {cycle.name}
              </option>
            ))}
            {options.classrooms.map((classroom) => (
              <option key={classroom.id} value={`classroom:${classroom.id}`}>
                {t('messaging.classAudience', { name: classroom.name })}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t('messaging.channels')}</legend>
        <div className="flex items-center gap-2">
          <Checkbox id="channel-app" checked disabled />
          <Label htmlFor="channel-app">{t('messaging.channelApp')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="channel-sms" checked={false} disabled />
          <Label htmlFor="channel-sms">{t('messaging.channelSms')}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{t('messaging.smsSoon')}</p>
      </fieldset>
      <Button
        type="submit"
        variant="accent"
        disabled={title.trim().length < 2 || body.trim() === '' || publish.isPending}
      >
        <Send aria-hidden />
        {t('messaging.publish')}
      </Button>
    </form>
  )
}

function AudienceBadge({ announcement }: { announcement: Announcement }) {
  const { t } = useTranslation()
  return (
    <Badge variant="secondary">
      {announcement.classroom !== null
        ? t('messaging.classAudience', { name: announcement.classroom.name })
        : (announcement.cycle?.name ?? t('messaging.audiences.all'))}
    </Badge>
  )
}

/** Annonces lues par l'utilisateur, la plus récente d'abord ; `limit` : les premières seulement (accueils). */
export function AnnouncementList({ limit, emptyLabel }: { limit?: number; emptyLabel?: string }) {
  const { t } = useTranslation()
  const query = useAnnouncements()
  const remove = useDeleteAnnouncement()

  return (
    <QueryState query={query}>
      {(announcements) => {
        const shown = limit === undefined ? announcements : announcements.slice(0, limit)
        return shown.length === 0 ? (
          <EmptyState title={emptyLabel ?? t('messaging.noAnnouncement')} />
        ) : (
          <ul className="grid grid-cols-1 content-start gap-3">
            {shown.map((announcement) => (
              <li key={announcement.id}>
                <Card>
                  <CardContent className="grid gap-2 pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <span className="flex items-center gap-1">
                        <AudienceBadge announcement={announcement} />
                        {announcement.can_delete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('messaging.remove', { title: announcement.title })}
                            disabled={remove.isPending}
                            onClick={() => {
                              remove
                                .mutateAsync(announcement.id)
                                .then(() => {
                                  toast(t('messaging.removed'), { tone: 'success' })
                                })
                                .catch(() => {
                                  toast(t('common.error'), { tone: 'error' })
                                })
                            }}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        )}
                      </span>
                    </div>
                    <p className="text-sm break-words whitespace-pre-line">{announcement.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('messaging.by', {
                        author: announcement.author_name,
                        date: formatDateTime(announcement.published_at),
                      })}
                      {announcement.can_delete &&
                        ` · ${t('messaging.reach', { count: announcement.reach })}`}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )
      }}
    </QueryState>
  )
}
