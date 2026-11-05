import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { meQueryOptions } from '@/features/auth/api'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type SchoolProfile = components['schemas']['SchoolProfileResource']
export type UpdateSchoolProfileInput = components['schemas']['UpdateSchoolProfileRequest']

/** Formats et poids acceptés pour le logo (mêmes règles que l'API, vérifiées avant l'envoi). */
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const LOGO_MAX_BYTES = 2 * 1024 * 1024

function useProfileKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'profile'] as const }
}

/**
 * Identité de l'école courante (vraie API). `logo_url` est une URL signée valable 30 minutes :
 * relue au plus tard après 10 minutes, jamais conservée au-delà.
 */
export function useSchoolProfile() {
  const { school, key } = useProfileKey()
  return useQuery({
    queryKey: key,
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<SchoolProfile> => {
      const { data, error } = await api.GET('/school', { signal })
      if (data === undefined) throw new Error('Identité de l’école indisponible', { cause: error })
      return data.data
    },
    staleTime: 10 * 60_000,
    gcTime: 20 * 60_000,
  })
}

function useSaveProfile() {
  const { key } = useProfileKey()
  const queryClient = useQueryClient()
  return (profile: SchoolProfile) => {
    queryClient.setQueryData(key, profile)
  }
}

export function useUpdateSchoolProfile() {
  const save = useSaveProfile()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateSchoolProfileInput): Promise<SchoolProfile> => {
      const { data, response } = await api.PATCH('/school', { body: input })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async (profile) => {
      save(profile)
      // Le nom affiché dans l'en-tête et le choix d'établissement vient de /me : relu pour suivre un renommage
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })
    },
  })
}

export function useUploadLogo() {
  const save = useSaveProfile()
  return useMutation({
    mutationFn: async (file: File): Promise<SchoolProfile> => {
      const form = new FormData()
      form.append('logo', file)
      const { data, response } = await api.POST('/school/logo', {
        // Corps réel : le formulaire multipart ci-dessus (le contrat décrit le champ `logo` en binaire)
        body: { logo: file.name },
        bodySerializer: () => form,
      })
      if (data === undefined) throw new Error(`Envoi impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useRemoveLogo() {
  const save = useSaveProfile()
  return useMutation({
    mutationFn: async (): Promise<SchoolProfile> => {
      const { data, response } = await api.DELETE('/school/logo')
      if (data === undefined) throw new Error(`Retrait impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}
