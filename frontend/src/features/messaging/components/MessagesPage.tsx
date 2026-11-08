import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDay, formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useConversations } from '../api'

import { AnnouncementForm, AnnouncementList } from './Announcements'
import { ConversationThread } from './ConversationThread'

function Conversations() {
  const { t } = useTranslation()
  const query = useConversations()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <QueryState query={query}>
      {(conversations) => {
        if (conversations.length === 0) return <EmptyState title={t('messaging.empty')} />
        const current = conversations.find((conversation) => conversation.id === selected)
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul
              className={cn(
                'grid grid-cols-1 content-start gap-2',
                current !== undefined && 'hidden lg:grid',
              )}
            >
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    aria-current={conversation.id === selected ? 'true' : undefined}
                    onClick={() => {
                      setSelected(conversation.id)
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-accent',
                      conversation.id === selected && 'border-accent ring-2 ring-accent/20',
                    )}
                  >
                    <Avatar name={conversation.guardian.name} size="sm" />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{conversation.guardian.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDay(conversation.last_message_at.slice(0, 10))}
                        </span>
                      </span>
                      <span className="truncate text-sm font-medium">{conversation.subject}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {`${conversation.student.full_name} · ${conversation.classroom.name}`}
                      </span>
                      {conversation.last_message !== null && (
                        <span className="truncate text-xs text-muted-foreground">
                          {conversation.last_message.preview}
                        </span>
                      )}
                    </span>
                    <span className="grid justify-items-end gap-1">
                      <Badge variant="outline">
                        {t(`messaging.channel.${conversation.channel}`)}
                      </Badge>
                      {conversation.unread > 0 && (
                        <Badge variant="accent">
                          {t('messaging.unread', { count: conversation.unread })}
                        </Badge>
                      )}
                    </span>
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
                        {current.guardian.name}
                        {current.guardian.phone !== null &&
                          ` · ${formatPhone(current.guardian.phone)}`}
                        {' · '}
                        {t('messaging.about', {
                          student: current.student.full_name,
                          classroom: current.classroom.name,
                        })}
                      </p>
                    </div>
                  </div>
                  <ConversationThread key={current.id} conversationId={current.id} />
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
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="h-fit">
        <CardContent className="pt-6">
          <AnnouncementForm />
        </CardContent>
      </Card>
      <AnnouncementList />
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
