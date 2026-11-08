import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { session } from '@/lib/api/session'

import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

/**
 * Écrans accessibles sans session : un 401 n'y provoque pas de redirection.
 * `/` n'affiche rien : sa route décide elle-même (connexion ou espace de l'utilisateur).
 */
const PUBLIC_PATHS = new Set(['/', '/connexion', '/etat', '/design'])

/** Pages publiques d'un établissement (`/{slug}`, `/{slug}/preinscription`), sans session ni affectation. */
const PUBLIC_ROUTE_IDS: ReadonlySet<string> = new Set(['/$school/', '/$school/preinscription'])

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient))

  // Session expirée (401, données locales déjà effacées) : retour à la connexion, puis à l'écran en cours
  useEffect(
    () =>
      session.onUnauthorized(() => {
        // Écran au moment du 401 (avant toute redirection faite par une garde)
        const { pathname, href } = router.state.location
        const isPublic =
          PUBLIC_PATHS.has(pathname) ||
          router.state.matches.some((match) => PUBLIC_ROUTE_IDS.has(match.routeId))

        // Après la tâche en cours seulement : vider le cache tout de suite annulerait la requête qui vient de
        // recevoir ce 401 (/me d'une garde), qui échouerait en « annulée » au lieu de « non connecté » et
        // afficherait l'écran d'erreur. La redirection suit le vidage, jamais l'inverse : sinon l'écran de
        // connexion trouverait encore le profil expiré en cache et renverrait vers l'espace de l'utilisateur.
        setTimeout(() => {
          // Toutes les données du compte quittent le cache (profil, cycles filtrés par les droits, démo…),
          // comme à la déconnexion : un autre compte connecté ensuite dans cet onglet ne les verra pas
          queryClient.clear()
          if (!isPublic) {
            void router.navigate({ to: '/connexion', search: { redirect: href } })
          }
        }, 0)
      }),
    [queryClient, router],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
