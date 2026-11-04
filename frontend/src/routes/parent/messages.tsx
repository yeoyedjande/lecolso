import { createFileRoute } from '@tanstack/react-router'

import { ParentMessages } from '@/features/parent/components/ParentMessages'

export const Route = createFileRoute('/parent/messages')({
  component: ParentMessages,
})
