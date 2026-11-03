import { createFileRoute } from '@tanstack/react-router'

import { SpaceHome } from '@/features/shell/SpaceHome'

export const Route = createFileRoute('/gestion/')({
  component: SpaceHome,
})
