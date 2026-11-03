import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/features/shell/ComingSoon'

/** Écrans de l'espace enseignant pas encore livrés (étape 6c). */
export const Route = createFileRoute('/enseignant/$')({
  component: () => <ComingSoon space="enseignant" />,
})
