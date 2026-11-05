import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type AcademicYear = components['schemas']['AcademicYearResource']
export type SaveAcademicYearInput = components['schemas']['SaveAcademicYearRequest']

function useYearsKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'academic-years'] as const }
}

/** Années scolaires de l'école (vraie API), la plus récente d'abord. */
export function useAcademicYears() {
  const { school, key } = useYearsKey()
  return useQuery({
    queryKey: key,
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<AcademicYear[]> => {
      const { data, error } = await api.GET('/academic-years', { signal })
      if (data === undefined) throw new Error('Années scolaires indisponibles', { cause: error })
      return data.data
    },
    staleTime: 5 * 60_000,
  })
}

/** Année en cours (undefined pendant le chargement, null si l'école n'en a pas). */
export function useCurrentAcademicYear(): AcademicYear | null | undefined {
  const { data } = useAcademicYears()
  return data === undefined ? undefined : (data.find((year) => year.is_current) ?? null)
}

/** Création (sans `id`) ou modification d'une année ; les classes en dépendent : relues aussi. */
export function useSaveAcademicYear() {
  const { school, key } = useYearsKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string | null
      input: SaveAcademicYearInput
    }): Promise<AcademicYear> => {
      const { data, response } =
        id === null
          ? await api.POST('/academic-years', { body: input })
          : await api.PATCH('/academic-years/{academicYear}', {
              params: { path: { academicYear: id } },
              body: input,
            })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: ['school', school?.id ?? null, 'classrooms'] }),
      ])
    },
  })
}
