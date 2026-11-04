import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type PlatformSchool = components['schemas']['SchoolResource']
export type CreateSchoolInput = components['schemas']['CreateSchoolRequest']

/** Écoles de la plateforme (super-admin, vraie API). Première page : 50 écoles triées par nom. */
export function usePlatformSchools() {
  return useQuery({
    queryKey: ['platform', 'schools'],
    queryFn: async ({ signal }): Promise<{ schools: PlatformSchool[]; hasMore: boolean }> => {
      const { data, error } = await api.GET('/platform/schools', { signal })
      if (data === undefined) throw new Error('Écoles indisponibles', { cause: error })
      return { schools: data.data, hasMore: data.meta.next_cursor !== null }
    },
  })
}

/** Création d'une école ; le mot de passe provisoire du directeur n'est renvoyé qu'une fois. 422 : ValidationError. */
export function useCreateSchool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSchoolInput) => {
      const { data, response } = await api.POST('/platform/schools', { body: input })
      if (data === undefined) throw new Error(`Création impossible (${String(response.status)})`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'schools'] }),
  })
}
