import { createFileRoute } from '@tanstack/react-router'

import { ParentHome } from '@/features/parent/components/ParentHome'

export const Route = createFileRoute('/parent/')({
  component: ParentHome,
})
