/** Messages de l'espace parent : démonstration jusqu'au lot 9 (messagerie). */
import { useMe } from '@/features/auth/api'
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'

import { parentConversations, parentReply } from './demo'

/** Téléphone du compte connecté : rattache le parent à ses conversations (démonstration). */
function usePhone(): string {
  return useMe().data?.phone ?? ''
}

export function useParentConversations() {
  const phone = usePhone()
  return useDemoQuery(['parent', 'conversations', phone], (school) =>
    parentConversations(school, phone),
  )
}

export function useParentReply() {
  const phone = usePhone()
  const author = useMe().data?.name ?? ''
  return useDemoMutation((school, input: { conversationId: string; body: string }) => {
    parentReply(school, { ...input, phone, author }, new Date())
  })
}
