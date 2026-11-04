import { useMe } from '@/features/auth/api'
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import type { PaymentMethod } from '@/lib/demo/types'

import {
  absencesToJustify,
  childDetail,
  justifyAbsence,
  myChildren,
  parentConversations,
  parentPayments,
  parentReply,
  payMobile,
  type JustifyReason,
} from './demo'

/** Téléphone du compte connecté : rattache le parent à ses enfants (démonstration ; l'API filtrera côté serveur). */
function usePhone(): string {
  return useMe().data?.phone ?? ''
}

export function useMyChildren() {
  const phone = usePhone()
  return useDemoQuery(['parent', 'children', phone], (school, today) =>
    myChildren(school, phone, today),
  )
}

export function useChild(studentId: string) {
  const phone = usePhone()
  return useDemoQuery(['parent', 'child', phone, studentId], (school, today) =>
    childDetail(school, phone, studentId, today),
  )
}

export function useAbsencesToJustify() {
  const phone = usePhone()
  return useDemoQuery(['parent', 'absences', phone], (school) => absencesToJustify(school, phone))
}

export function useJustifyAbsence() {
  const phone = usePhone()
  return useDemoMutation(
    (
      school,
      input: {
        studentId: string
        from: string
        to: string
        reason: JustifyReason
        comment: string
      },
    ) => justifyAbsence(school, { ...input, phone }),
  )
}

export function useParentPayments() {
  const phone = usePhone()
  return useDemoQuery(['parent', 'payments', phone], (school) => parentPayments(school, phone))
}

export function usePayMobile() {
  const phone = usePhone()
  return useDemoMutation(
    (
      school,
      input: { studentId: string; amount: number; operator: PaymentMethod; walletPhone: string },
    ) => payMobile(school, { ...input, phone }, new Date()),
  )
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
