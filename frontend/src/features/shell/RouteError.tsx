import { ErrorState } from '@/components/states/ErrorState'

/** Erreur de chargement d'une route (réseau, serveur) : nouvel essai. */
export function RouteError({ reset }: { reset: () => void }) {
  return (
    <main id="contenu" className="mx-auto flex min-h-[60dvh] max-w-xl items-center px-5 py-10">
      <ErrorState onRetry={reset} className="w-full" />
    </main>
  )
}
