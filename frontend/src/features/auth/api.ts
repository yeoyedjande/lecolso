import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { clearLocalData } from '@/lib/offline/wipe'

export type Profile = components['schemas']['ProfileResource']

export interface LoginInput {
  /** Téléphone (« 07 00 00 00 00 ») ou e-mail */
  login: string
  password: string
  /** « Se souvenir de moi » : pris en compte pour les seuls comptes sans rôle du personnel */
  remember?: boolean
}

export interface ChangePasswordInput {
  current_password: string
  password: string
  password_confirmation: string
}

export const meQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async ({ signal }): Promise<Profile> => {
    const { data, error } = await api.GET('/me', { signal })
    if (data === undefined) {
      throw new Error('Profil indisponible', { cause: error })
    }
    return data.data
  },
  retry: false,
  staleTime: 60_000,
})

/** Profil de l'utilisateur connecté : écoles, rôles par cycle, permissions. */
export function useMe() {
  return useQuery(meQueryOptions)
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput): Promise<Profile> => {
      const { data, error } = await api.POST('/auth/login', { body: input })
      if (data === undefined) {
        throw new Error('Connexion impossible', { cause: error })
      }
      return data.data
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(meQueryOptions.queryKey, profile)
    },
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ChangePasswordInput): Promise<void> => {
      const { response } = await api.POST('/auth/password', { body: input })
      if (!response.ok) {
        throw new Error('Changement de mot de passe impossible')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
  })
}

/** Déconnexion : session invalidée côté API, puis plus aucune donnée locale (Dexie, caches, cache des requêtes). */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      try {
        await api.POST('/auth/logout')
      } finally {
        await clearLocalData()
        queryClient.clear()
      }
    },
  })
}
