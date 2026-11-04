import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type Cycle = components['schemas']['CycleResource']
export type CycleSettings = Cycle['settings']
export type UpdateCycleInput = components['schemas']['UpdateCycleRequest']

/** Cycles de l'école courante (vraie API) ; un utilisateur limité à un cycle ne reçoit que celui-ci. */
export function useCycles() {
  const school = useCurrentSchool()
  return useQuery({
    queryKey: ['cycles', school?.id ?? null],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<Cycle[]> => {
      const { data, error } = await api.GET('/cycles', { signal })
      if (data === undefined) throw new Error('Cycles indisponibles', { cause: error })
      return data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useUpdateCycle() {
  const school = useCurrentSchool()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCycleInput }): Promise<Cycle> => {
      const { data, response } = await api.PATCH('/cycles/{cycle}', {
        params: { path: { cycle: id } },
        body: input,
      })
      if (data === undefined)
        throw new Error(`Modification impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cycles', school?.id ?? null] }),
  })
}
