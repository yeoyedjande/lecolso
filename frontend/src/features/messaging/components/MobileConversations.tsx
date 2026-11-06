import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDay } from '@/lib/format'

import type { Conversation } from '../api'

import { ConversationThread } from './ConversationThread'

/** Conversations sur téléphone : liste, puis fil plein écran avec réponse (`selected` contrôlable). */
export function MobileConversations({
  conversations,
  emptyLabel,
  titleOf,
  selected: controlled,
  onSelect,
}: {
  conversations: Conversation[]
  emptyLabel: string
  titleOf: (conversation: Conversation) => string
  selected?: string | null
  onSelect?: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const [own, setOwn] = useState<string | null>(null)
  const selected = controlled ?? own
  const select = (id: string | null) => {
    setOwn(id)
    onSelect?.(id)
  }
  const current = conversations.find((conversation) => conversation.id === selected)

  if (current !== undefined) {
    return (
      <div className="grid gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            select(null)
          }}
        >
          <ArrowLeft aria-hidden />
          {t('messaging.back')}
        </Button>
        <div>
          <h2 className="font-display text-lg font-semibold">{current.subject}</h2>
          <p className="text-sm text-muted-foreground">{titleOf(current)}</p>
        </div>
        <ConversationThread conversationId={current.id} />
      </div>
    )
  }

  if (conversations.length === 0) return <EmptyState title={emptyLabel} />

  // grid-cols-1 (minmax(0, 1fr)) : les aperçus sur une ligne ne débordent pas à 360 px
  return (
    <ul className="grid grid-cols-1 gap-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            onClick={() => {
              select(conversation.id)
            }}
            className="flex min-h-16 w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left shadow-soft"
          >
            <Avatar name={titleOf(conversation)} size="sm" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{conversation.subject}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDay(conversation.last_message_at.slice(0, 10))}
                </span>
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {titleOf(conversation)}
              </span>
              {conversation.last_message !== null && (
                <span className="truncate text-xs text-muted-foreground">
                  {conversation.last_message.preview}
                </span>
              )}
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
