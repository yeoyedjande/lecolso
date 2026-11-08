import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type Classroom = components['schemas']['ClassroomResource']
export type SaveClassroomInput = components['schemas']['SaveClassroomRequest']

function useClassroomsKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'classrooms'] as const }
}

/** Classes d'une année (l'année en cours par défaut), vraie API, limitées aux cycles de l'utilisateur. */
export function useClassroomList(academicYearId: string | null = null) {
  const { school, key } = useClassroomsKey()
  return useQuery({
    queryKey: [...key, academicYearId],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<Classroom[]> => {
      const { data, error } = await api.GET('/classrooms', {
        params: { query: { academic_year_id: academicYearId } },
        signal,
      })
      if (data === undefined) throw new Error('Classes indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Création (sans `id`) ou modification d'une classe. */
export function useSaveClassroom() {
  const { key } = useClassroomsKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string | null
      input: SaveClassroomInput
    }): Promise<Classroom> => {
      const { data, response } =
        id === null
          ? await api.POST('/classrooms', { body: input })
          : await api.PATCH('/classrooms/{classroom}', {
              params: { path: { classroom: id } },
              body: input,
            })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteClassroom() {
  const { key } = useClassroomsKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { response } = await api.DELETE('/classrooms/{classroom}', {
        params: { path: { classroom: id } },
      })
      if (!response.ok) throw new Error(`Suppression impossible (${String(response.status)})`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
