import { createFileRoute, notFound } from '@tanstack/react-router'

import { DesignPage } from '@/features/design/DesignPage'

/**
 * Page /design (design system) : en local et en staging seulement. En production, la route renvoie une 404
 * et vite.config.ts remplace DesignPage par un module vide : le code de la page n'est pas dans le build.
 */
const enabled =
  import.meta.env.VITE_APP_ENV === 'local' || import.meta.env.VITE_APP_ENV === 'staging'

export const Route = createFileRoute('/design')({
  beforeLoad: () => {
    if (!enabled) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 404 TanStack Router
      throw notFound()
    }
  },
  component: DesignPage,
})
