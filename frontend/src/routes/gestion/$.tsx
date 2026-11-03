import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/features/shell/ComingSoon'

/** Écrans du back-office pas encore livrés (étape 6b). */
export const Route = createFileRoute('/gestion/$')({
  component: () => <ComingSoon space="gestion" />,
})
