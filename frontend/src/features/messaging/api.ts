import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import type { DemoAnnouncement } from '@/lib/demo/types'

import { announce, conversations, markRead, reply } from './demo'

export function useConversations() {
  return useDemoQuery(['messaging', 'conversations'], (school) => conversations(school))
}

export function useReply() {
  return useDemoMutation((school, input: { conversationId: string; body: string; author: string }) => {
    reply(school, input.conversationId, input.body, input.author, new Date())
  })
}

export function useMarkRead() {
  return useDemoMutation((school, conversationId: string) => {
    markRead(school, conversationId)
  })
}

export function useAnnouncements() {
  return useDemoQuery(['messaging', 'announcements'], (school) => [...school.announcements])
}

export function useAnnounce() {
  return useDemoMutation(
    (school, input: Pick<DemoAnnouncement, 'title' | 'body' | 'audience' | 'channels' | 'author'>) =>
      announce(school, input, new Date()),
  )
}
