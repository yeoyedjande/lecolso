/** Messages de l'espace enseignant : démonstration jusqu'au lot 9 (messagerie). */
import { useMe } from '@/features/auth/api'
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'

import { messageParent, myClasses, teacherConversations } from './demo'

function usePhone(): string {
  return useMe().data?.phone ?? ''
}

/** Classes dont l'enseignant connecté est titulaire (démonstration ; l'API filtrera côté serveur). */
export function useMyClasses() {
  const phone = usePhone()
  return useDemoQuery(['teacher', 'classes', phone], (school, today) =>
    myClasses(school, phone, today),
  )
}

export function useTeacherConversations() {
  const phone = usePhone()
  return useDemoQuery(['teacher', 'conversations', phone], (school) =>
    teacherConversations(school, phone),
  )
}

export function useMessageParent() {
  const phone = usePhone()
  const author = useMe().data?.name ?? ''
  return useDemoMutation((school, input: { studentId: string; subject: string; body: string }) =>
    messageParent(school, { ...input, phone, author }, new Date()),
  )
}
