import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { meQueryOptions } from '@/features/auth/api'
import { session } from '@/lib/api/session'

import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

/** Écrans accessibles sans session : un 401 n'y provoque pas de redirection. */
const PUBLIC_PATHS = new Set(['/connexion', '/etat', '/design'])

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient))

  // Session expirée (401, données locales déjà effacées) : retour à la connexion, puis à l'écran en cours
  useEffect(
    () =>
      session.onUnauthorized(() => {
        queryClient.removeQueries({ queryKey: meQueryOptions.queryKey })
        const { pathname, href } = router.state.location
        if (!PUBLIC_PATHS.has(pathname)) {
          void router.navigate({ to: '/connexion', search: { redirect: href } })
        }
      }),
    [queryClient, router],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
