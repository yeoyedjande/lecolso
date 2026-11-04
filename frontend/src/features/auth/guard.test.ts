import { QueryClient } from '@tanstack/react-query'
import { isNotFound, isRedirect } from '@tanstack/react-router'
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

    expect(
      await redirectOf(guard(new QueryClient(), 'gestion', '/les-lauriers/eleves', 'les-lauriers')),
    ).toMatchObject({
      to: '/connexion',
      search: { redirect: '/les-lauriers/eleves' },
    })
  })

  it('école de l’URL parmi les siennes : son UUID (jamais le slug) devient l’en-tête X-School-Id', async () => {
    server.use(http.get(`${API_URL}/me`, () => HttpResponse.json({ data: profile() })))

    const result = await guard(new QueryClient(), 'gestion', '/les-lauriers/eleves', 'les-lauriers')

    expect(result.membership).toEqual(membership())
    expect(session.getSchoolId()).toBe('school-a')
  })

  it('école sans affectation : page introuvable, l’école de l’onglet ne change pas', async () => {
    server.use(http.get(`${API_URL}/me`, () => HttpResponse.json({ data: profile() })))
    session.setSchoolId('school-a')

    const error = await guard(
      new QueryClient(),
      'gestion',
      '/petits-genies/eleves',
      'petits-genies',
    ).catch((caught: unknown) => caught)

    expect(isNotFound(error)).toBe(true)
    expect(session.getSchoolId()).toBe('school-a')
  })

  it('accueil : redirection vers le tableau de bord de l’école, avec son slug', async () => {
    server.use(http.get(`${API_URL}/me`, () => HttpResponse.json({ data: profile() })))

    expect(await redirectOf(guard(new QueryClient(), 'home', '/'))).toMatchObject({
      to: '/$school/tableau-de-bord',
      params: { school: 'les-lauriers' },
    })
  })

  it('erreur réseau ou serveur : remontée à l’écran d’erreur, pas de redirection', async () => {
    server.use(
      http.get(`${API_URL}/me`, () =>
        HttpResponse.json({ message: 'Server Error' }, { status: 500 }),
      ),
    )

    await expect(
      guard(new QueryClient(), 'gestion', '/les-lauriers', 'les-lauriers'),
    ).rejects.toThrow('Profil indisponible')
  })
})

describe('safeRedirect', () => {
  it.each([
    ['/les-lauriers/eleves?classe=ce1', '/les-lauriers/eleves?classe=ce1'],
    ['//evil.example', undefined],
    ['/\\evil.example', undefined],
    ['https://evil.example', undefined],
    [42, undefined],
  ])('%j → %j', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected)
  })
})
