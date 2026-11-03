import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/offline/db'
import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'

import { meQueryOptions, useLogout } from './api'

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLogout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('déconnecte côté API puis efface toutes les données locales', async () => {
    document.cookie = 'XSRF-TOKEN=jeton; path=/'
    const deleteDb = vi.spyOn(db, 'delete').mockResolvedValue(undefined)
    const logout = vi.fn()
    server.use(
      http.post(`${API_URL}/auth/logout`, () => {
        logout()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const queryClient = new QueryClient()
    queryClient.setQueryData(meQueryOptions.queryKey, {
      id: 'u1',
      name: 'Awa',
      phone: '+2250701020304',
      email: null,
      must_change_password: false,
      is_super_admin: false,
      can_be_remembered: false,
      schools: [],
    })
    window.localStorage.setItem('gestion-ecole.school-id', 'ecole-1')

    const { result } = renderHook(() => useLogout(), { wrapper: wrapperWith(queryClient) })
    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(logout).toHaveBeenCalledOnce()
    expect(deleteDb).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem('gestion-ecole.school-id')).toBeNull()
    expect(queryClient.getQueryData(meQueryOptions.queryKey)).toBeUndefined()
  })

  it('efface les données locales même si l’API ne répond pas', async () => {
    document.cookie = 'XSRF-TOKEN=jeton; path=/'
    const deleteDb = vi.spyOn(db, 'delete').mockResolvedValue(undefined)
    server.use(http.post(`${API_URL}/auth/logout`, () => HttpResponse.error()))
    window.localStorage.setItem('gestion-ecole.school-id', 'ecole-1')

    const { result } = renderHook(() => useLogout(), { wrapper: wrapperWith(new QueryClient()) })
    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(deleteDb).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem('gestion-ecole.school-id')).toBeNull()
  })
})
