import { createFileRoute, redirect } from '@tanstack/react-router'

import { slugFromHost } from '@/features/auth/access'
import { guard, loadProfile } from '@/features/auth/guard'
import { env } from '@/lib/env'

/**
 * Accueil : redirige vers l'espace de l'utilisateur (ou connexion, mot de passe, choix d'établissement).
 * Sur <slug>.<domaine> sans session : page publique de l'école.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context, location }) => {
    const slug = slugFromHost(window.location.hostname, env.tenantDomain)
    if (slug !== null && (await loadProfile(context.queryClient)) === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: '/ecole/$slug', params: { slug } })
    }
    await guard(context.queryClient, 'home', location.href)
  },
})
