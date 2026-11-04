import createClient, { type Middleware } from 'openapi-fetch'

import { env } from '@/lib/env'
import { clearLocalData } from '@/lib/offline/wipe'

import { XSRF_HEADER, ensureXsrfToken, readXsrfToken, refreshCsrfCookie } from './csrf'
import {
  ConflictError,
  conflictErrorBodySchema,
  UnauthorizedError,
  ValidationError,
  validationErrorBodySchema,
} from './errors'
import type { paths } from './schema'
import { session } from './session'

/**
 * Seul point d'accès à l'API. Les composants ne l'importent jamais : ils passent par les hooks
 * de features/<domaine>/api.ts (TanStack Query).
 *
 * Authentification par cookie de session httpOnly (Sanctum, mode SPA) : credentials « include »,
 * jeton CSRF (X-XSRF-TOKEN) sur les requêtes qui écrivent, aucun jeton côté JavaScript.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Copie des requêtes qui écrivent, pour les rejouer une fois après un jeton CSRF expiré (419). */
const replayable = new Map<string, Request>()

export const sessionMiddleware: Middleware = {
  async onRequest({ request, id }) {
    request.headers.set('Accept', 'application/json')
    request.headers.set('X-Requested-With', 'XMLHttpRequest')

    // Seul endroit où X-School-Id est ajouté (frontend/CLAUDE.md)
    const schoolId = session.getSchoolId()
    if (schoolId !== null) {
      request.headers.set('X-School-Id', schoolId)
    }

    if (!SAFE_METHODS.has(request.method)) {
      const token = await ensureXsrfToken()
      if (token !== null) {
        request.headers.set(XSRF_HEADER, token)
      }
      replayable.set(id, request.clone())
    }

    return request
  },

  async onResponse({ response: received, id }) {
    const original = replayable.get(id)
    replayable.delete(id)

    let response = received

    // Jeton CSRF expiré : nouveau cookie, puis un seul nouvel essai (sa réponse suit les mêmes règles)
    if (response.status === 419 && original !== undefined) {
      await refreshCsrfCookie()
      const token = readXsrfToken()
      if (token !== null) {
        original.headers.set(XSRF_HEADER, token)
      }
      response = await globalThis.fetch(original)
    }

    if (response.status === 401) {
      // Session expirée : plus aucune donnée personnelle ne reste sur l'appareil
      await clearLocalData()
      session.notifyUnauthorized()
      throw new UnauthorizedError()
    }

    if (response.status === 422) {
      const parsed = validationErrorBodySchema.safeParse(await response.clone().json())
      if (parsed.success) {
        throw new ValidationError(parsed.data.message, parsed.data.errors)
      }
    }

    if (response.status === 409) {
      const parsed = conflictErrorBodySchema.safeParse(await response.clone().json())
      if (parsed.success) {
        throw new ConflictError(parsed.data.code, parsed.data.message)
      }
    }

    return response
  },
}

export const api = createClient<paths>({
  baseUrl: env.apiUrl,
  credentials: 'include',
  // fetch résolu à chaque appel (et non capturé à la création) : permet à MSW de l'intercepter en test
  fetch: (request) => globalThis.fetch(request),
})

api.use(sessionMiddleware)
