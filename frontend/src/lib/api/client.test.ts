import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/offline/db'
import { API_URL, healthy } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'

import { api } from './client'
import { csrfCookieUrl } from './csrf'
import { ConflictError, UnauthorizedError, ValidationError } from './errors'
import { session } from './session'

function setXsrfCookie(value: string): void {
  document.cookie = `XSRF-TOKEN=${encodeURIComponent(value)}; path=/`
}

function clearXsrfCookie(): void {
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

const loginUrl = `${API_URL}/auth/login`
const profile = {
  data: {
    id: 'u1',
    name: 'Awa Koné',
    phone: '+2250701020304',
    email: null,
    must_change_password: false,
    is_super_admin: false,
    can_be_remembered: false,
    schools: [],
  },
}

describe('client HTTP (cookie de session Sanctum)', () => {
  let deleteDb: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    clearXsrfCookie()
    deleteDb = vi.spyOn(db, 'delete').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('envoie les cookies (credentials « include ») sans aucun jeton dans localStorage', async () => {
    // Lu sur la requête passée à fetch : l'intercepteur Node de MSW reconstruit la requête et perd « credentials »
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    let authorization: string | null = 'non lu'
    server.use(
      http.get(`${API_URL}/health`, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json(healthy)
      }),
    )

    await api.GET('/health')

    const sent = fetchSpy.mock.calls[0]?.[0]
    expect(sent).toBeInstanceOf(Request)
    expect(sent instanceof Request ? sent.credentials : null).toBe('include')
    expect(authorization).toBeNull()
    expect(Object.keys(window.localStorage).some((key) => /token/i.test(key))).toBe(false)
    expect(session).not.toHaveProperty('getToken')
    expect(session).not.toHaveProperty('setToken')
  })

  it('ajoute l’en-tête X-School-Id de l’établissement sélectionné', async () => {
    session.setSchoolId('01a1a06c-1400-7000-8000-000000000001')
    let schoolHeader: string | null = null
    server.use(
      http.get(`${API_URL}/health`, ({ request }) => {
        schoolHeader = request.headers.get('X-School-Id')
        return HttpResponse.json(healthy)
      }),
    )

    await api.GET('/health')

    expect(schoolHeader).toBe('01a1a06c-1400-7000-8000-000000000001')
  })

  it('récupère le cookie CSRF avant la première requête qui écrit, puis envoie X-XSRF-TOKEN', async () => {
    const calls: string[] = []
    let xsrfHeader: string | null = null
    server.use(
      http.get(csrfCookieUrl, () => {
        calls.push('csrf-cookie')
        setXsrfCookie('jeton=1')
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(loginUrl, ({ request }) => {
        calls.push('login')
        xsrfHeader = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json(profile)
      }),
    )

    await api.POST('/auth/login', { body: { login: '0701020304', password: 'secret' } })

    expect(calls).toEqual(['csrf-cookie', 'login'])
    expect(xsrfHeader).toBe('jeton=1')
  })

  it('ne redemande pas le cookie CSRF s’il est déjà présent, ni pour une lecture', async () => {
    setXsrfCookie('existant')
    const csrfCalls = vi.fn()
    server.use(
      http.get(csrfCookieUrl, () => {
        csrfCalls()
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(loginUrl, () => HttpResponse.json(profile)),
    )

    await api.GET('/health')
    await api.POST('/auth/login', { body: { login: '0701020304', password: 'secret' } })

    expect(csrfCalls).not.toHaveBeenCalled()
  })

  it('renouvelle le jeton CSRF et rejoue une seule fois la requête après un 419', async () => {
    setXsrfCookie('expiré')
    const seenTokens: (string | null)[] = []
    server.use(
      http.get(csrfCookieUrl, () => {
        setXsrfCookie('neuf')
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(loginUrl, ({ request }) => {
        const token = request.headers.get('X-XSRF-TOKEN')
        seenTokens.push(token)
        return token === 'neuf'
          ? HttpResponse.json(profile)
          : HttpResponse.json({ message: 'CSRF token mismatch.' }, { status: 419 })
      }),
    )

    const { data } = await api.POST('/auth/login', {
      body: { login: '0701020304', password: 'secret' },
    })

    expect(seenTokens).toEqual(['expiré', 'neuf'])
    expect(data?.data.id).toBe('u1')
  })

  it('efface les données locales et lève UnauthorizedError sur un 401', async () => {
    session.setSchoolId('01a1a06c-1400-7000-8000-000000000001')
    const unauthorized = vi.fn()
    const unsubscribe = session.onUnauthorized(unauthorized)
    server.use(
      http.get(`${API_URL}/me`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )

    await expect(api.GET('/me')).rejects.toBeInstanceOf(UnauthorizedError)

    expect(session.getSchoolId()).toBeNull()
    expect(deleteDb).toHaveBeenCalledOnce()
    expect(unauthorized).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('lève ValidationError avec les messages par champ sur un 422', async () => {
    setXsrfCookie('jeton')
    server.use(
      http.post(loginUrl, () =>
        HttpResponse.json(
          {
            message: 'Identifiant ou mot de passe incorrect.',
            errors: { login: ['Identifiant ou mot de passe incorrect.'] },
          },
          { status: 422 },
        ),
      ),
    )

    const error: unknown = await api
      .POST('/auth/login', { body: { login: 'x', password: 'y' } })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ValidationError)
    expect(error).toMatchObject({ fields: { login: ['Identifiant ou mot de passe incorrect.'] } })
  })

  it('lève ConflictError avec le code métier sur un 409', async () => {
    setXsrfCookie('jeton')
    server.use(
      http.post(loginUrl, () =>
        HttpResponse.json(
          { message: 'Ce rôle est encore attribué.', code: 'role_in_use' },
          { status: 409 },
        ),
      ),
    )

    const error: unknown = await api
      .POST('/auth/login', { body: { login: 'x', password: 'y' } })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ConflictError)
    expect(error).toMatchObject({ code: 'role_in_use', message: 'Ce rôle est encore attribué.' })
  })
})
