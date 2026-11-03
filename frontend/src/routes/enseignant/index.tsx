import { createFileRoute } from '@tanstack/react-router'

import { SpaceHome } from '@/features/shell/SpaceHome'

export const Route = createFileRoute('/enseignant/')({
  component: SpaceHome,
})
