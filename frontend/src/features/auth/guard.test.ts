import { QueryClient } from '@tanstack/react-query'
import { isNotFound, isRedirect } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { session } from '@/lib/api/session'
import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { membership, profile } from '@/test/profiles'

import { meQueryOptions, type Profile } from './api'
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

describe('guard : profil en cache (navigation sans attente)', () => {
  function countMe(answer: () => ReturnType<typeof profile>) {
    const calls = { count: 0 }
    server.use(
      http.get(`${API_URL}/me`, () => {
        calls.count += 1
        return HttpResponse.json({ data: answer() })
      }),
    )
    return calls
  }

  it('profil récent : aucune requête /me, la page s’affiche tout de suite', async () => {
    const calls = countMe(() => profile())
    const queryClient = new QueryClient()
    queryClient.setQueryData(meQueryOptions.queryKey, profile())

    const result = await guard(queryClient, 'gestion', '/les-lauriers/eleves', 'les-lauriers')

    expect(result.profile.id).toBe('user-1')
    expect(calls.count).toBe(0)
  })

  it('profil de plus de 60 s : renvoyé sans attendre, puis revérifié en arrière-plan', async () => {
    const calls = countMe(() => profile({ name: 'Nom mis à jour' }))
    const queryClient = new QueryClient()
    queryClient.setQueryData(meQueryOptions.queryKey, profile(), {
      updatedAt: Date.now() - 61_000,
    })

    const result = await guard(queryClient, 'gestion', '/les-lauriers/eleves', 'les-lauriers')

    expect(result.profile.name).toBe('Yao Directeur')
    await vi.waitFor(() => {
      expect(queryClient.getQueryData<Profile>(meQueryOptions.queryKey)?.name).toBe(
        'Nom mis à jour',
      )
    })
    expect(calls.count).toBe(1)
  })

  it('profil invalidé (mot de passe changé) : /me est attendu, jamais l’ancien profil', async () => {
    const calls = countMe(() => profile({ must_change_password: false }))
    const queryClient = new QueryClient()
    queryClient.setQueryData(meQueryOptions.queryKey, profile({ must_change_password: true }))
    await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })

    const result = await guard(queryClient, 'gestion', '/les-lauriers/eleves', 'les-lauriers')

    expect(result.profile.must_change_password).toBe(false)
    expect(calls.count).toBe(1)
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
