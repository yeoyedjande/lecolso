import type { QueryClient } from '@tanstack/react-query'
import { notFound, redirect } from '@tanstack/react-router'

import { session } from '@/lib/api/session'
import { UnauthorizedError } from '@/lib/api/errors'

import { decideAccess, type Membership, type Requirement } from './access'
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
 * Garde des routes (beforeLoad) : session, mot de passe provisoire, établissement de l'URL, espace.
 * Lève une redirection TanStack Router ou une page introuvable ; sinon renvoie le profil et l'établissement.
 * L'établissement autorisé devient celui de l'onglet : son UUID (jamais le slug) part dans X-School-Id.
 */
export async function guard(
  queryClient: QueryClient,
  requirement: Requirement,
  href: string,
  slug: string | null = null,
): Promise<{ profile: Profile; membership: Membership | null }> {
  const profile = await loadProfile(queryClient)
  if (profile === null) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
    throw redirect({ to: '/connexion', search: { redirect: safeRedirect(href) } })
  }

  const decision = decideAccess({
    profile,
    slug,
    lastSchoolId: session.getLastSchoolId(),
    requirement,
  })

  if (decision.kind === 'notFound') {
    // Aucune requête n'est envoyée à l'API pour cette école : son UUID n'est pas connu de l'onglet
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- page introuvable TanStack Router
    throw notFound()
  }

  if (decision.kind === 'redirect') {
    const { target } = decision
    if ('school' in target) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: target.to, params: { school: target.school } })
    }
    if (target.to === '/etablissements' && requirement !== 'home') {
      // L'écran demandé (lien profond) est rouvert une fois l'établissement choisi
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: '/etablissements', search: { redirect: safeRedirect(href) } })
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
    throw redirect({ to: target.to })
  }

  if (decision.membership !== null) session.setSchoolId(decision.membership.id)

  return { profile, membership: decision.membership }
}
