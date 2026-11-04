import { http, HttpResponse } from 'msw'

import type { HealthReport } from '@/features/system/api'

export const API_URL = 'http://api.test/api/v1'

export const healthy: HealthReport = { status: 'ok', database: 'ok', redis: 'ok' }

/** Réponses par défaut de l'API simulée ; chaque test peut les surcharger avec server.use(). */
export const handlers = [
  http.get(`${API_URL}/health`, () => HttpResponse.json(healthy)),
  // Cookie CSRF de Sanctum (racine de l'API, hors /api/v1)
  http.get(
    `${new URL(API_URL).origin}/sanctum/csrf-cookie`,
    () => new HttpResponse(null, { status: 204 }),
  ),
]
