import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { generateSchool } from '@/lib/demo/dataset'
import { demo } from '@/lib/demo/store'

import { submitPreRegistration, type PreRegistrationInput } from './demo'

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

/** Tarifs indicatifs (données de démonstration tant que le module frais n'a pas d'API publique). */
export function usePublicFees(slug: string) {
  return useQuery({
    queryKey: ['public', 'fees', slug],
    queryFn: () =>
      demo(() => {
        const school = generateSchool(slug)
        return { levels: school.levels, fees: school.fees }
      }),
  })
}

/** Pré-inscription en ligne (démonstration : aucune donnée n'est envoyée au serveur). */
export function usePreRegister(slug: string) {
  return useMutation({
    mutationFn: (input: PreRegistrationInput) =>
      demo(() => submitPreRegistration(slug, input, new Date())),
  })
}
