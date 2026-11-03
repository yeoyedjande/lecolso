import { queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type HealthReport = components['schemas']['HealthResource']

const componentStatus = z.enum(['ok', 'error'])

// Le type vient de schema.d.ts ; zod vérifie seulement que la réponse reçue y correspond
const healthReportSchema: z.ZodType<HealthReport> = z.object({
  status: componentStatus,
  database: componentStatus,
  redis: componentStatus,
})

/**
 * GET /health. Seuls 200 et 503 portent un état (le 503 décrit le composant en panne).
 * Tout le reste (500, réponse mal formée, réseau, CORS) fait échouer la requête :
 * l'écran affiche alors « API injoignable » avec le bouton Réessayer.
 */
async function fetchHealth(signal: AbortSignal): Promise<HealthReport> {
  const { data, error, response } = await api.GET('/health', { signal })

  if (response.status === 200 || response.status === 503) {
    const report = healthReportSchema.safeParse(data ?? error)
    if (report.success) {
      return report.data
    }
  }

  throw new Error(`Réponse inattendue de /health (HTTP ${String(response.status)})`)
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
