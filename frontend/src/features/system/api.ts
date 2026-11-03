import { queryOptions, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type HealthReport = components['schemas']['HealthResource']

/**
 * GET /health. Un 503 n'est pas une erreur ici : son corps décrit le composant en panne.
 * Seule une API injoignable (réseau, CORS, réponse inattendue) fait échouer la requête.
 */
async function fetchHealth(signal: AbortSignal): Promise<HealthReport> {
  const { data, error } = await api.GET('/health', { signal })

  // 200 → data ; 503 → error (même schéma HealthResource)
  return data ?? error
}

export const healthQueryOptions = queryOptions({
  queryKey: ['system', 'health'],
  queryFn: ({ signal }) => fetchHealth(signal),
  retry: false,
  refetchInterval: 30_000,
})

export function useHealth() {
  return useQuery(healthQueryOptions)
}
