import { useTranslation } from 'react-i18next'

import { DemoBanner } from '@/components/states/DemoBanner'
import { QueryState } from '@/components/states/QueryState'
import { MobileConversations } from '@/features/messaging/components/MobileConversations'

import { useParentConversations, useParentReply } from '../api'

/** Messages du parent avec l'école. */
export function ParentMessages() {
  const { t } = useTranslation()
  const conversations = useParentConversations()
  const reply = useParentReply()
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">{t('parent.messages.title')}</h1>
        <p className="text-muted-foreground">{t('parent.messages.subtitle')}</p>
      </div>
      <QueryState query={conversations}>
        {(list) => (
          <MobileConversations
            conversations={list}
            own="guardian"
            emptyLabel={t('parent.messages.empty')}
            titleOf={(conversation) =>
              t('parent.messages.about', { child: conversation.childName })
            }
            sending={reply.isPending}
            onReply={(conversationId, body) => reply.mutateAsync({ conversationId, body })}
          />
        )}
      </QueryState>
    </div>
  )
}
