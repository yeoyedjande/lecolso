import { createFileRoute } from '@tanstack/react-router'

import { guard } from '@/features/auth/guard'

/** Accueil : redirige vers l'espace de l'utilisateur (ou connexion, mot de passe, choix d'établissement). */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context, location }) => {
    await guard(context.queryClient, 'home', location.href)
  },
})
