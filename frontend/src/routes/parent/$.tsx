import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/features/shell/ComingSoon'

/** Écrans de l'espace parent pas encore livrés (étape 6c). */
export const Route = createFileRoute('/parent/$')({
  component: () => <ComingSoon space="parent" />,
})
