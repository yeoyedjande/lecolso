import { useMutation } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import { demo } from '@/lib/demo/store'

import { identity, provisionalPassword, staff, updateIdentity, type SchoolIdentity } from './demo'

export function useSchoolIdentity() {
  return useDemoQuery(['settings', 'identity'], (school) => identity(school))
}

export function useUpdateIdentity() {
  return useDemoMutation((school, input: Omit<SchoolIdentity, 'year'>) => {
    updateIdentity(school, input)
  })
}

export function useStaff() {
  return useDemoQuery(['settings', 'staff'], (school) => staff(school))
}

/**
 * Réinitialisation du mot de passe d'un membre du personnel. L'API existe (POST /users/{user}/password-reset)
 * mais la liste des utilisateurs n'a pas encore de route : les comptes listés sont de démonstration,
 * l'appel réel n'est donc fait que pour un identifiant d'utilisateur réel (UUID).
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (userId: string): Promise<string> => {
      if (!/^[0-9a-f-]{36}$/.test(userId)) return demo(() => provisionalPassword())
      const { data, response } = await api.POST('/users/{user}/password-reset', {
        params: { path: { user: userId } },
      })
      if (data === undefined)
        throw new Error(`Réinitialisation impossible (${String(response.status)})`)
      return data.provisional_password
    },
  })
}
