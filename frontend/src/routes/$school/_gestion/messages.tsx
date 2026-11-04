import { createFileRoute } from '@tanstack/react-router'

import { RequirePermission } from '@/features/auth/RequirePermission'
import { MessagesPage } from '@/features/messaging/components/MessagesPage'

export const Route = createFileRoute('/$school/_gestion/messages')({
  component: () => (
    <RequirePermission permission="messaging.send">
      <MessagesPage />
    </RequirePermission>
  ),
})
