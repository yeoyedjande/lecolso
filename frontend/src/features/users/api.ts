import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { meQueryOptions } from '@/features/auth/api'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type SchoolUser = components['schemas']['SchoolUserResource']
export type UserAssignment = components['schemas']['UserAssignmentResource']
export type CreateUserInput = components['schemas']['StoreSchoolUserRequest']
export type UpdateUserInput = components['schemas']['UpdateSchoolUserRequest']

export type UserStatus = 'all' | 'active' | 'deactivated'

export interface UserFilters {
  search: string
  role: string | null
  status: UserStatus
}

function useUsersKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'users'] as const }
}

const NO_CURSOR: string | null = null

/** Comptes de l'école (vraie API), 25 par page, page suivante par curseur. */
export function useSchoolUsers(filters: UserFilters) {
  const { school, key } = useUsersKey()
  return useInfiniteQuery({
    queryKey: [...key, filters],
    enabled: school !== null,
    initialPageParam: NO_CURSOR,
    queryFn: async ({ pageParam, signal }: { pageParam: string | null; signal: AbortSignal }) => {
      const { data, error } = await api.GET('/users', {
        params: {
          query: {
            search: filters.search.trim() === '' ? null : filters.search.trim(),
            role: filters.role,
            status: filters.status,
            cursor: pageParam,
          },
        },
        signal,
      })
      if (data === undefined) throw new Error('Utilisateurs indisponibles', { cause: error })
      return data
    },
    getNextPageParam: (page) => page.meta.next_cursor,
  })
}

/** Après une écriture : la liste, les rôles (nombre d'utilisateurs) et le profil (/me). */
function useInvalidateUsers() {
  const { school, key } = useUsersKey()
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ['school', school?.id ?? null, 'roles'] }),
      queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
    ])
  }
}

/** Échec d'une action, avec son statut HTTP (403 : action interdite sur ce compte ou ce rôle). */
export class UserActionError extends Error {
  override readonly name = 'UserActionError'

  readonly status: number

  constructor(action: string, status: number) {
    super(`${action} impossible (${String(status)})`)
    this.status = status
  }
}

function failure(action: string, status: number): UserActionError {
  return new UserActionError(action, status)
}

export interface CreatedUser {
  user: SchoolUser
  /** Nouveau compte : mot de passe provisoire, montré une seule fois. Compte existant rattaché : null. */
  provisionalPassword: string | null
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: async (input: CreateUserInput): Promise<CreatedUser> => {
      const { data, response } = await api.POST('/users', { body: input })
      if (data === undefined) throw failure('Création', response.status)
      return { user: data.data, provisionalPassword: data.provisional_password }
    },
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdateUserInput
    }): Promise<SchoolUser> => {
      const { data, response } = await api.PATCH('/users/{user}', {
        params: { path: { user: id } },
        body: input,
      })
      if (data === undefined) throw failure('Modification', response.status)
      return data.data
    },
    onSuccess: invalidate,
  })
}

export function useAssignRole() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: async ({
      id,
      role,
      cycleId,
    }: {
      id: string
      role: string
      cycleId: string | null
    }): Promise<SchoolUser> => {
      const { data, response } = await api.POST('/users/{user}/roles', {
        params: { path: { user: id } },
        body: { role, cycle_id: cycleId },
      })
      if (data === undefined) throw failure('Attribution', response.status)
      return data.data
    },
    onSuccess: invalidate,
  })
}

export function useRevokeRole() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: async ({
      id,
      assignment,
    }: {
      id: string
      assignment: string
    }): Promise<SchoolUser> => {
      const { data, response } = await api.DELETE('/users/{user}/roles/{assignment}', {
        params: { path: { user: id, assignment } },
      })
      if (data === undefined) throw failure('Retrait', response.status)
      return data.data
    },
    onSuccess: invalidate,
  })
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<SchoolUser> => {
      const path = { params: { path: { user: id } } }
      const { data, response } = active
        ? await api.POST('/users/{user}/reactivate', path)
        : await api.POST('/users/{user}/deactivate', path)
      if (data === undefined)
        throw failure(active ? 'Réactivation' : 'Désactivation', response.status)
      return data.data
    },
    onSuccess: invalidate,
  })
}

/** Supprime le compte de l'école ; `true` s'il a été effacé (aucune autre école). */
export function useRemoveUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      const { data, response } = await api.DELETE('/users/{user}', {
        params: { path: { user: id } },
      })
      if (data === undefined) throw failure('Suppression', response.status)
      return data.erased
    },
    onSuccess: invalidate,
  })
}

/** Nouveau mot de passe provisoire pour un compte de l'école (montré une seule fois). */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { data, response } = await api.POST('/users/{user}/password-reset', {
        params: { path: { user: id } },
      })
      if (data === undefined) throw failure('Réinitialisation', response.status)
      return data.provisional_password
    },
  })
}
