import createClient, { type Middleware } from 'openapi-fetch'

import { env } from '@/lib/env'

import { UnauthorizedError, ValidationError, validationErrorBodySchema } from './errors'
import type { paths } from './schema'
import { session } from './session'

/**
 * Seul point d'accès à l'API. Les composants ne l'importent jamais : ils passent par les hooks
 * de features/<domaine>/api.ts (TanStack Query).
 */

/** Ajoute le token Sanctum et l'établissement courant ; remonte les erreurs 401 et 422. */
export const sessionMiddleware: Middleware = {
  onRequest({ request }) {
    request.headers.set('Accept', 'application/json')

    const token = session.getToken()
    if (token !== null) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }

    // Seul endroit où X-School-Id est ajouté (frontend/CLAUDE.md)
    const schoolId = session.getSchoolId()
    if (schoolId !== null) {
      request.headers.set('X-School-Id', schoolId)
    }

    return request
  },

  async onResponse({ response }) {
    if (response.status === 401) {
      session.clear()
      throw new UnauthorizedError()
    }

    if (response.status === 422) {
      const parsed = validationErrorBodySchema.safeParse(await response.clone().json())
      if (parsed.success) {
        throw new ValidationError(parsed.data.message, parsed.data.errors)
      }
    }

    return response
  },
}

export const api = createClient<paths>({
  baseUrl: env.apiUrl,
  // fetch résolu à chaque appel (et non capturé à la création) : permet à MSW de l'intercepter en test
  fetch: (request) => globalThis.fetch(request),
})

api.use(sessionMiddleware)
