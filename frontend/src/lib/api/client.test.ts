import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL, healthy } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'

import { api } from './client'
import { UnauthorizedError, ValidationError } from './errors'
import { session } from './session'

describe('client HTTP', () => {
  it('appelle VITE_API_URL sans token ni établissement quand la session est vide', async () => {
    let headers: Headers | undefined
    server.use(
      http.get(`${API_URL}/health`, ({ request }) => {
        headers = request.headers
        return HttpResponse.json(healthy)
      }),
    )

    const { data } = await api.GET('/health')

    expect(data).toEqual(healthy)
    expect(headers?.get('Accept')).toBe('application/json')
    expect(headers?.has('Authorization')).toBe(false)
    expect(headers?.has('X-School-Id')).toBe(false)
  })

  it('ajoute le token Sanctum et l’en-tête X-School-Id', async () => {
    session.setToken('1|token-de-test')
    session.setSchoolId('01a1a06c-1400-7000-8000-000000000001')

    let headers: Headers | undefined
    server.use(
      http.get(`${API_URL}/health`, ({ request }) => {
        headers = request.headers
        return HttpResponse.json(healthy)
      }),
    )

    await api.GET('/health')

    expect(headers?.get('Authorization')).toBe('Bearer 1|token-de-test')
    expect(headers?.get('X-School-Id')).toBe('01a1a06c-1400-7000-8000-000000000001')
  })

  it('efface la session et lève UnauthorizedError sur un 401', async () => {
    session.setToken('1|expiré')
    session.setSchoolId('01a1a06c-1400-7000-8000-000000000001')
    server.use(
      http.get(`${API_URL}/health`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )

    await expect(api.GET('/health')).rejects.toBeInstanceOf(UnauthorizedError)
    expect(session.getToken()).toBeNull()
    expect(session.getSchoolId()).toBeNull()
  })

  it('lève ValidationError avec les messages par champ sur un 422', async () => {
    server.use(
      http.get(`${API_URL}/health`, () =>
        HttpResponse.json(
          {
            message: 'Le téléphone est invalide.',
            errors: { phone: ['Le téléphone est invalide.'] },
          },
          { status: 422 },
        ),
      ),
    )

    const error: unknown = await api.GET('/health').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ValidationError)
    expect(error).toMatchObject({ fields: { phone: ['Le téléphone est invalide.'] } })
  })
})
