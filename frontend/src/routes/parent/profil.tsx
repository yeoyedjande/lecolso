import { createFileRoute } from '@tanstack/react-router'

import { MobileProfile } from '@/features/shell/MobileProfile'

export const Route = createFileRoute('/parent/profil')({
  component: MobileProfile,
})
