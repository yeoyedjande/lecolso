import { ArrowLeft, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, formatDay } from '@/lib/format'
import type { DemoConversation } from '@/lib/demo/types'
import { cn } from '@/lib/utils'

export type MobileConversation = DemoConversation & {
  childName: string
  lastAt: string
  classroom?: string
}

/**
 * Conversations sur téléphone : liste, puis fil plein écran avec réponse. `own` : côté de l'utilisateur
 * (parent : « guardian », enseignant : « school »), aligné à droite.
 */
export function MobileConversations({
  conversations,
  own,
  emptyLabel,
  titleOf,
  onReply,
  sending,
}: {
  conversations: MobileConversation[]
  own: 'guardian' | 'school'
  emptyLabel: string
  titleOf: (conversation: MobileConversation) => string
  onReply: (conversationId: string, body: string) => Promise<unknown>
  sending: boolean
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const current = conversations.find((conversation) => conversation.id === selected)

  if (conversations.length === 0) return <EmptyState title={emptyLabel} />

  if (current !== undefined) {
    return (
      <div className="grid gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            setSelected(null)
          }}
        >
          <ArrowLeft aria-hidden />
          {t('messaging.back')}
        </Button>
        <div>
          <h2 className="font-display text-lg font-semibold">{current.subject}</h2>
          <p className="text-sm text-muted-foreground">{titleOf(current)}</p>
        </div>
        <ol className="grid gap-3">
          {current.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                'grid max-w-[85%] gap-1 rounded-2xl px-4 py-2.5 text-sm',
                message.from === own
                  ? 'justify-self-end rounded-br-md bg-primary text-primary-foreground'
                  : 'justify-self-start rounded-bl-md bg-card shadow-soft',
              )}
            >
              <span>{message.body}</span>
              <span className="text-xs opacity-80">
                {message.author} · {formatDateTime(message.sentAt)}
              </span>
            </li>
          ))}
        </ol>
        <form
          className="sticky bottom-24 grid gap-2 rounded-2xl border bg-card p-3 shadow-lift"
          onSubmit={(event) => {
            event.preventDefault()
            if (body.trim() === '') return
            void onReply(current.id, body.trim()).then(() => {
              setBody('')
            })
          }}
        >
          <Label htmlFor="mobile-reply" className="sr-only">
            {t('messaging.reply')}
          </Label>
          <Textarea
            id="mobile-reply"
            rows={2}
            placeholder={t('messaging.replyPlaceholder')}
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
            }}
          />
          <Button type="submit" disabled={body.trim() === '' || sending}>
            <Send aria-hidden />
            {t('messaging.send')}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <ul className="grid gap-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            onClick={() => {
              setSelected(conversation.id)
            }}
            className="flex min-h-16 w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left shadow-soft"
          >
            <Avatar name={titleOf(conversation)} size="sm" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{conversation.subject}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDay(conversation.lastAt.slice(0, 10))}
                </span>
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {titleOf(conversation)}
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
  )
}
