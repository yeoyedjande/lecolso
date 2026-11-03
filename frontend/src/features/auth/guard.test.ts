import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { session } from '@/lib/api/session'
import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { membership, profile } from '@/test/profiles'

import { guard, safeRedirect } from './guard'

vi.mock('@/lib/offline/wipe', () => ({ clearLocalData: vi.fn(() => Promise.resolve()) }))

async function redirectOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    if (isRedirect(error)) return error.options
    throw error
  }
  return null
}

describe('guard', () => {
  it('sans session (401) : connexion, avec retour à l’écran demandé', async () => {
    server.use(
      http.get(`${API_URL}/me`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )

    expect(await redirectOf(guard(new QueryClient(), 'gestion', '/gestion/eleves'))).toMatchObject({
      to: '/connexion',
      search: { redirect: '/gestion/eleves' },
    })
  })

  it('choix automatique : l’établissement est mémorisé pour l’en-tête X-School-Id', async () => {
    server.use(http.get(`${API_URL}/me`, () => HttpResponse.json({ data: profile() })))

    const result = await guard(new QueryClient(), 'gestion', '/gestion')

    expect(result.membership).toEqual(membership())
    expect(session.getSchoolId()).toBe('school-a')
  })

  it('erreur réseau ou serveur : remontée à l’écran d’erreur, pas de redirection', async () => {
    server.use(
      http.get(`${API_URL}/me`, () =>
        HttpResponse.json({ message: 'Server Error' }, { status: 500 }),
      ),
    )

    await expect(guard(new QueryClient(), 'gestion', '/gestion')).rejects.toThrow(
      'Profil indisponible',
    )
  })
})

describe('safeRedirect', () => {
  it.each([
    ['/gestion/eleves?classe=ce1', '/gestion/eleves?classe=ce1'],
    ['//evil.example', undefined],
    ['/\\evil.example', undefined],
    ['https://evil.example', undefined],
    [42, undefined],
  ])('%j → %j', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected)
  })
})
