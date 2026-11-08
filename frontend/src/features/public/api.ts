import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type PublicSchool = components['schemas']['PublicSchoolResource']

/** Page publique d'une école (vraie API, sans connexion) ; null si le slug est inconnu (404). */
export function usePublicSchool(slug: string) {
  return useQuery({
    queryKey: ['public', 'school', slug],
    queryFn: async ({ signal }): Promise<PublicSchool | null> => {
      const { data, response } = await api.GET('/public/schools/{slug}', {
        params: { path: { slug } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('École indisponible')
      return data.data
    },
    retry: false,
  })
}

export type PublicFeeGrid = components['schemas']['PublicFeeGridResource']
export type PreRegistrationBody = components['schemas']['SubmitPreRegistrationRequest']

/** Tarifs publiés par l'école (vraie API, sans connexion) ; null si l'école ne les publie pas. */
export function usePublicFees(slug: string) {
  return useQuery({
    queryKey: ['public', 'fees', slug],
    queryFn: async ({ signal }): Promise<PublicFeeGrid | null> => {
      const { data, response } = await api.GET('/public/schools/{slug}/fees', {
        params: { path: { slug } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Tarifs indisponibles')
      return data.data
    },
    retry: false,
  })
}

/** Trop d'envois depuis cette adresse ou pour ce numéro (429). */
export class TooManyPreRegistrations extends Error {
  override readonly name = 'TooManyPreRegistrations'
}

/** Pré-inscription en ligne (vraie API, sans connexion) : renvoie le numéro du dossier. */
export function usePreRegister(slug: string) {
  return useMutation({
    mutationFn: async (body: PreRegistrationBody): Promise<string> => {
      const { data, response } = await api.POST('/public/schools/{slug}/pre-registrations', {
        params: { path: { slug } },
        body,
      })
      if (response.status === 429) throw new TooManyPreRegistrations('Trop de demandes')
      if (data === undefined) throw new Error(`Envoi impossible (${String(response.status)})`)
      return data.data.reference
    },
  })
}
