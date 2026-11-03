import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { session } from '@/lib/api/session'
import { UnauthorizedError } from '@/lib/api/errors'
import { env } from '@/lib/env'

import { decideAccess, slugFromHost, type Membership, type Requirement } from './access'
import { meQueryOptions, type Profile } from './api'

/** Profil connecté, ou null sans session (401). Les autres erreurs (réseau, serveur) remontent à l'écran d'erreur. */
export async function loadProfile(queryClient: QueryClient): Promise<Profile | null> {
  try {
    // Cache du profil (60 s), refait après invalidation (changement de mot de passe)
    return await queryClient.query(meQueryOptions)
  } catch (error) {
    if (error instanceof UnauthorizedError) return null
    throw error
  }
}

/** Chemin interne sûr pour la redirection après connexion (pas d'URL externe ni « //hôte »). */
export function safeRedirect(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return undefined
  }
  return value
}

/**
 * Garde des routes (beforeLoad) : session, mot de passe provisoire, établissement, espace.
 * Lève une redirection TanStack Router ; sinon renvoie le profil et l'établissement courant.
 */
export async function guard(
  queryClient: QueryClient,
  requirement: Requirement,
  href: string,
): Promise<{ profile: Profile; membership: Membership | null }> {
  const profile = await loadProfile(queryClient)
  if (profile === null) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
    throw redirect({ to: '/connexion', search: { redirect: safeRedirect(href) } })
  }

  const decision = decideAccess({
    profile,
    schoolId: session.getSchoolId(),
    slug: slugFromHost(window.location.hostname, env.tenantDomain),
    requirement,
  })

  if (decision.selectSchoolId !== undefined) session.setSchoolId(decision.selectSchoolId)
  if (decision.kind === 'redirect') {
    if (decision.to === '/etablissements' && requirement !== 'home') {
      // L'écran demandé (lien profond) est rouvert une fois l'établissement choisi
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: '/etablissements', search: { redirect: safeRedirect(href) } })
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
    throw redirect({ to: decision.to })
  }

  return { profile, membership: decision.membership }
}
