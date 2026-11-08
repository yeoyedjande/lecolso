import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'

/**
 * Accueil : redirige vers l'espace de l'utilisateur dans sa dernière école (`/{slug}/…`), ou vers la connexion,
 * le changement de mot de passe, le choix d'établissement ou la plateforme. Aucun sous-domaine (ADR 0005).
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context, location, preload }) => {
    await guard(context.queryClient, 'home', location.href, null, preload)
  },
})
