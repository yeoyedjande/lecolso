import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { meQueryOptions } from '@/features/auth/api'
import { session } from '@/lib/api/session'
import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { profile } from '@/test/profiles'

import { useAllSchoolUsers } from './api'

function user(index: number) {
  return {
    id: `user-${String(index)}`,
    name: `Enseignant ${String(index).padStart(2, '0')}`,
    phone: `+22507000000${String(index).padStart(2, '0')}`,
    email: null,
    active: true,
    must_change_password: false,
    last_login_at: null,
    roles: [{ id: `a-${String(index)}`, role: 'teacher', role_name: null, cycle_id: null }],
    can_manage: true,
  }
}

describe('useAllSchoolUsers', () => {
  it('enchaîne les pages du curseur avant de rendre la liste complète', async () => {
    const all = Array.from({ length: 30 }, (_, index) => user(index + 1))
    const cursors: (string | null)[] = []
    server.use(
      http.get(`${API_URL}/users`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        cursors.push(cursor)
        const first = cursor === null
        return HttpResponse.json({
          data: first ? all.slice(0, 25) : all.slice(25),
          links: { first: null, last: null, prev: null, next: null },
          meta: { path: '', per_page: 25, next_cursor: first ? 'page-2' : null, prev_cursor: null },
        })
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(meQueryOptions.queryKey, profile())
    session.setSchoolId('school-a')

    const { result } = renderHook(
      () => useAllSchoolUsers({ search: '', role: 'teacher', status: 'active' }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      },
    )

    await waitFor(() => {
      expect(result.current).toHaveLength(30)
    })
    expect(cursors).toEqual([null, 'page-2'])
    expect(result.current?.at(-1)?.name).toBe('Enseignant 30')
  })
})
