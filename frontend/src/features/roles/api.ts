import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { meQueryOptions } from '@/features/auth/api'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type SchoolRole = components['schemas']['SchoolRoleResource']
export type Permission = components['schemas']['PermissionResource']
export type CreateRoleInput = components['schemas']['StoreSchoolRoleRequest']
export type UpdateRoleInput = components['schemas']['UpdateSchoolRoleRequest']

function useRolesKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'roles'] as const }
}

/** Rôles de l'école courante : rôles système puis rôles personnalisés (vraie API). */
export function useSchoolRoles() {
  const { school, key } = useRolesKey()
  return useQuery({
    queryKey: key,
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<SchoolRole[]> => {
      const { data, error } = await api.GET('/roles', { signal })
      if (data === undefined) throw new Error('Rôles indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Catalogue des permissions (identique pour toutes les écoles). */
export function usePermissionCatalog() {
  const school = useCurrentSchool()
  return useQuery({
    queryKey: ['permissions'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<Permission[]> => {
      const { data, error } = await api.GET('/permissions', { signal })
      if (data === undefined) throw new Error('Permissions indisponibles', { cause: error })
      return data.data
    },
    staleTime: 60 * 60_000,
  })
}

/**
 * Après une écriture : la liste des rôles, et le profil (/me), dont les permissions peuvent avoir changé
 * si l'utilisateur détient lui-même le rôle modifié.
 */
function useInvalidateRoles() {
  const { key } = useRolesKey()
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
    ])
  }
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: async (input: CreateRoleInput): Promise<SchoolRole> => {
      const { data, response } = await api.POST('/roles', { body: input })
      if (data === undefined) throw new Error(`Création impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: async ({
      key,
      input,
    }: {
      key: string
      input: UpdateRoleInput
    }): Promise<SchoolRole> => {
      const { data, response } = await api.PATCH('/roles/{role}', {
        params: { path: { role: key } },
        body: input,
      })
      if (data === undefined)
        throw new Error(`Modification impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: async (key: string): Promise<void> => {
      const { response } = await api.DELETE('/roles/{role}', { params: { path: { role: key } } })
      if (!response.ok) throw new Error(`Suppression impossible (${String(response.status)})`)
    },
    onSuccess: invalidate,
  })
}
