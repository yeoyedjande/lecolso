import { ArrowLeft, Megaphone, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useMe } from '@/features/auth/api'
import { useClassroomOptions } from '@/features/classes/api'
import { formatDateTime, formatDay } from '@/lib/format'
import type { DemoAnnouncement } from '@/lib/demo/types'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useAnnounce, useAnnouncements, useConversations, useMarkRead, useReply } from '../api'

function Conversations() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const query = useConversations()
  const reply = useReply()
  const markRead = useMarkRead()
  const [selected, setSelected] = useState<string | null>(null)
  const [body, setBody] = useState('')

  return (
    <QueryState query={query}>
      {(conversations) => {
        if (conversations.length === 0) return <EmptyState title={t('messaging.empty')} />
        const current = conversations.find((conversation) => conversation.id === selected)
        return (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul
              className={cn('grid content-start gap-2', current !== undefined && 'hidden lg:grid')}
            >
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    aria-current={conversation.id === selected ? 'true' : undefined}
                    onClick={() => {
                      setSelected(conversation.id)
                      if (conversation.unread > 0) markRead.mutate(conversation.id)
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-accent',
                      conversation.id === selected && 'border-accent ring-2 ring-accent/20',
                    )}
                  >
                    <Avatar name={conversation.guardianName} size="sm" />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{conversation.guardianName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDay(conversation.lastAt.slice(0, 10))}
                        </span>
                      </span>
                      <span className="truncate text-sm font-medium">{conversation.subject}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {conversation.preview}
                      </span>
                    </span>
                    {conversation.unread > 0 && (
                      <Badge variant="accent">
                        {t('messaging.unread', { count: conversation.unread })}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {current === undefined ? (
              <div className="hidden lg:block">
                <EmptyState title={t('messaging.choose')} />
              </div>
            ) : (
              <Card className="flex min-h-[28rem] flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 pt-5">
                  <div className="flex items-start gap-3 border-b pb-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="lg:hidden"
                      aria-label={t('messaging.back')}
                      onClick={() => {
                        setSelected(null)
                      }}
                    >
                      <ArrowLeft aria-hidden />
                    </Button>
                    <div>
                      <h2 className="font-display text-lg font-semibold">{current.subject}</h2>
                      <p className="text-sm text-muted-foreground">
                        {current.guardianName} ·{' '}
                        {t('messaging.about', {
                          student: current.studentName,
                          classroom: current.classroom,
                        })}
                      </p>
                    </div>
                  </div>
                  <ol className="grid flex-1 content-start gap-3">
                    {current.messages.map((message) => (
                      <li
                        key={message.id}
                        className={cn(
                          'grid max-w-[85%] gap-1 rounded-2xl px-4 py-2.5 text-sm',
                          message.from === 'school'
                            ? 'justify-self-end rounded-br-md bg-primary text-primary-foreground'
                            : 'justify-self-start rounded-bl-md bg-muted',
                        )}
                      >
                        <span>{message.body}</span>
                        <span className="text-xs opacity-80">
                          {message.from === 'school' ? message.author : current.guardianName} ·{' '}
                          {formatDateTime(message.sentAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (body.trim() === '') return
                      void reply
                        .mutateAsync({
                          conversationId: current.id,
                          body,
                          author: profile?.name ?? t('messaging.school'),
                        })
                        .then(() => {
                          setBody('')
                        })
                    }}
                  >
                    <Label htmlFor="reply" className="sr-only">
                      {t('messaging.reply')}
                    </Label>
                    <Textarea
                      id="reply"
                      rows={2}
                      placeholder={t('messaging.replyPlaceholder')}
                      value={body}
                      onChange={(event) => {
                        setBody(event.target.value)
                      }}
                    />
                    <Button type="submit" disabled={body.trim() === '' || reply.isPending}>
                      <Send aria-hidden />
                      {t('messaging.send')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )
      }}
    </QueryState>
  )
}

function Announcements() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const query = useAnnouncements()
  const announce = useAnnounce()
  const classes = useClassroomOptions()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<DemoAnnouncement['audience']>('all')
  const [sms, setSms] = useState(false)

  const audienceLabel = (value: DemoAnnouncement['audience']): string => {
    if (value.startsWith('class:')) {
      const classroom = classes.data?.find((candidate) => `class:${candidate.id}` === value)
      return t('messaging.classAudience', { name: classroom?.name ?? '' })
    }
    return value === 'all' || value === 'daycare' || value === 'kindergarten' || value === 'primary'
      ? t(`messaging.audiences.${value}`)
      : value
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (title.trim() === '' || body.trim() === '') return
              void announce
                .mutateAsync({
                  title: title.trim(),
                  body: body.trim(),
                  audience,
                  channels: sms ? ['app', 'sms'] : ['app'],
                  author: profile?.name ?? '',
                })
                .then((created) => {
                  toast(t('messaging.published', { count: created.reach }), { tone: 'success' })
                  setTitle('')
                  setBody('')
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
                  value={audience}
                  onChange={(event) => {
                    const value = event.target.value
                    if (
                      value === 'all' ||
                      value === 'daycare' ||
                      value === 'kindergarten' ||
                      value === 'primary'
                    )
                      setAudience(value)
                    else if (value.startsWith('class:')) setAudience(`class:${value.slice(6)}`)
                  }}
                >
                  <option value="all">{t('messaging.audiences.all')}</option>
                  <option value="daycare">{t('messaging.audiences.daycare')}</option>
                  <option value="kindergarten">{t('messaging.audiences.kindergarten')}</option>
                  <option value="primary">{t('messaging.audiences.primary')}</option>
                  {(classes.data ?? []).map((classroom) => (
                    <option key={classroom.id} value={`class:${classroom.id}`}>
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
                <Checkbox
                  id="channel-sms"
                  checked={sms}
                  onCheckedChange={(checked) => {
                    setSms(checked === true)
                  }}
                />
                <Label htmlFor="channel-sms">{t('messaging.channelSms')}</Label>
              </div>
              {sms && <p className="text-xs text-muted-foreground">{t('messaging.smsHint')}</p>}
            </fieldset>
            <Button
              type="submit"
              variant="accent"
              disabled={title.trim() === '' || body.trim() === '' || announce.isPending}
            >
              <Send aria-hidden />
              {t('messaging.publish')}
            </Button>
          </form>
        </CardContent>
      </Card>
      <QueryState query={query}>
        {(announcements) =>
          announcements.length === 0 ? (
            <EmptyState title={t('messaging.noAnnouncement')} />
          ) : (
            <ul className="grid content-start gap-3">
              {announcements.map((announcement) => (
                <li key={announcement.id}>
                  <Card>
                    <CardContent className="grid gap-2 pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <div className="flex gap-1">
                          <Badge variant="secondary">{audienceLabel(announcement.audience)}</Badge>
                          {announcement.channels.includes('sms') && (
                            <Badge variant="outline">{t('messaging.channelSms')}</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm">{announcement.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('messaging.by', {
                          author: announcement.author,
                          date: formatDateTime(announcement.sentAt),
                        })}{' '}
                        · {t('messaging.reach', { count: announcement.reach })}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
    </div>
  )
}

/** Messages avec les familles et annonces. */
export function MessagesPage() {
  const { t } = useTranslation()
  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('messaging.title')} description={t('messaging.description')} />
      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations">{t('messaging.tabs.conversations')}</TabsTrigger>
          <TabsTrigger value="announcements">{t('messaging.tabs.announcements')}</TabsTrigger>
        </TabsList>
        <TabsContent value="conversations" className="mt-4">
          <Conversations />
        </TabsContent>
        <TabsContent value="announcements" className="mt-4">
          <Announcements />
        </TabsContent>
      </Tabs>
    </div>
  )
}
