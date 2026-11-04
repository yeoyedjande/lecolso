import { env } from '@/lib/env'

/**
 * Protection CSRF de Sanctum (mode SPA) : le cookie XSRF-TOKEN (posé par GET /sanctum/csrf-cookie pour l'hôte
 * de l'application) est renvoyé dans l'en-tête X-XSRF-TOKEN de chaque requête qui modifie des données.
 */
export const XSRF_COOKIE = 'XSRF-TOKEN'
export const XSRF_HEADER = 'X-XSRF-TOKEN'

/**
 * La route /sanctum/csrf-cookie est à la racine de l'API, hors du préfixe /api/v1 : sur la même origine
 * (staging, production : proxy Caddy) c'est un chemin, sinon l'origine de l'API (développement local).
 */
export function csrfCookieUrlFor(apiUrl: string): string {
  return apiUrl.startsWith('/')
    ? '/sanctum/csrf-cookie'
    : `${new URL(apiUrl).origin}/sanctum/csrf-cookie`
}

export const csrfCookieUrl = csrfCookieUrlFor(env.apiUrl)

export function readXsrfToken(): string | null {
  const prefix = `${XSRF_COOKIE}=`
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix))

  return entry === undefined ? null : decodeURIComponent(entry.slice(prefix.length))
}

/** Demande un nouveau cookie XSRF-TOKEN à l'API. */
export async function refreshCsrfCookie(): Promise<void> {
  await globalThis.fetch(csrfCookieUrl, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
}

/** Jeton CSRF courant, récupéré auprès de l'API s'il manque. */
export async function ensureXsrfToken(): Promise<string | null> {
  const token = readXsrfToken()
  if (token !== null) {
    return token
  }

  await refreshCsrfCookie()

  return readXsrfToken()
}
