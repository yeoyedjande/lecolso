import { useQuery } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type DashboardData = components['schemas']['DashboardResource']

/** Effectifs et finances de l'année en cours (vraie API), dans les cycles de l'utilisateur. */
export function useDashboard() {
  const school = useCurrentSchool()
  return useQuery({
    queryKey: ['school', school?.id ?? null, 'billing', 'dashboard'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<DashboardData> => {
      const { data, error } = await api.GET('/billing/dashboard', { signal })
      if (data === undefined) throw new Error('Tableau de bord indisponible', { cause: error })
      return data.data
    },
  })
}
