import { createFileRoute, redirect } from '@tanstack/react-router'

import { findMembership, spacesOf, type Space } from '@/features/auth/access'
import { guard } from '@/features/auth/guard'
import { session } from '@/lib/api/session'

/** Profil de chaque espace : la page « Mon compte » s'affiche dans la mise en page de l'espace. */
const PROFILE_OF = {
  gestion: '/$school/profil',
  enseignant: '/$school/enseignant/profil',
  parent: '/$school/parent/profil',
} as const satisfies Record<Space, string>

/**
 * Adresse globale du compte (`/compte`), indépendante des établissements : ouvre le profil dans le premier espace
 * de l'école de l'onglet (ou de la dernière école utilisée), sinon passe par l'accueil (choix d'école, plateforme).
 */
export const Route = createFileRoute('/compte')({
  beforeLoad: async ({ context, location, preload }) => {
    const { profile } = await guard(context.queryClient, 'schools', location.href, null, preload)
    const membership = findMembership(profile, session.getLastSchoolId())
    const first = membership === null ? undefined : spacesOf(membership)[0]
    if (membership === null || first === undefined) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: '/' })
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
    throw redirect({ to: PROFILE_OF[first], params: { school: membership.slug } })
  },
})
