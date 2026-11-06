import { CalendarX2, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatDateTime } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useConversation, useMarkRead, useReply, type Message } from '../api'

function PlannedCard({ planned }: { planned: NonNullable<Message['planned_absence']> }) {
  const { t } = useTranslation()
  return (
    <span className="flex items-center gap-2 rounded-xl bg-background/60 px-2 py-1 text-xs text-foreground">
      <CalendarX2 aria-hidden className="size-4 shrink-0" />
      {planned.starts_on === planned.ends_on
        ? t('messaging.planned.on', { date: formatDate(planned.starts_on) })
        : t('messaging.planned.range', {
            from: formatDate(planned.starts_on),
            to: formatDate(planned.ends_on),
          })}
      <Badge variant={planned.status === 'accepted' ? 'success' : 'outline'}>
        {t(`messaging.planned.status.${planned.status}`)}
      </Badge>
    </span>
  )
}

/**
 * Fil de messages : messages de l'utilisateur à droite, réponse si l'utilisateur peut écrire (sinon lecture seule).
 * Ouvert, le fil est marqué comme lu.
 */
export function ConversationThread({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation()
  const query = useConversation(conversationId)
  const reply = useReply()
  const markRead = useMarkRead()
  const [body, setBody] = useState('')
  const unread = query.data?.conversation.unread ?? 0
  const { mutate: read } = markRead

  useEffect(() => {
    if (unread > 0) read(conversationId)
  }, [conversationId, unread, read])

  return (
    <QueryState query={query} skeleton={<ListSkeleton />}>
      {(detail) =>
        detail === null ? (
          <EmptyState title={t('messaging.notFound')} />
        ) : (
          <div className="grid gap-4">
            <ol className="grid content-start gap-3" aria-label={t('messaging.thread')}>
              {detail.messages.map((message) => (
                <li
                  key={message.id}
                  className={cn(
                    'grid max-w-[85%] gap-1 rounded-2xl px-4 py-2.5 text-sm',
                    message.side === detail.conversation.side
                      ? 'justify-self-end rounded-br-md bg-primary text-primary-foreground'
                      : 'justify-self-start rounded-bl-md bg-muted',
                  )}
                >
                  <span className="whitespace-pre-line">{message.body}</span>
                  {message.planned_absence !== null && (
                    <PlannedCard planned={message.planned_absence} />
                  )}
                  <span className="text-xs opacity-80">
                    {message.author_name} · {formatDateTime(message.sent_at)}
                  </span>
                </li>
              ))}
            </ol>
            {detail.conversation.can_write ? (
              <form
                className="grid gap-2 sm:flex sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (body.trim() === '') return
                  reply
                    .mutateAsync({ conversationId, body: body.trim() })
                    .then(() => {
                      setBody('')
                    })
                    .catch(() => {
                      toast(t('common.error'), { tone: 'error' })
                    })
                }}
              >
                <Label htmlFor={`reply-${conversationId}`} className="sr-only">
                  {t('messaging.reply')}
                </Label>
                <Textarea
                  id={`reply-${conversationId}`}
                  rows={2}
                  maxLength={2000}
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
            ) : (
              <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground" role="note">
                {t('messaging.readOnly')}
              </p>
            )}
          </div>
        )
      }
    </QueryState>
  )
}
