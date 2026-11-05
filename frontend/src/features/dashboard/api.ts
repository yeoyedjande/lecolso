import { useQuery } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { useDemoQuery } from '@/lib/demo/hooks'

import { dashboard } from './demo'

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

/** Présences du tableau de bord : démonstration tant que le module présences n'a pas d'API. */
export function useDashboardAttendance() {
  return useDemoQuery(['dashboard', 'attendance'], (school, today) => {
    const summary = dashboard(school, today)
    return {
      absentToday: summary.absentToday,
      lateToday: summary.lateToday,
      rollCallsMissing: summary.rollCallsMissing,
      attendance: summary.attendance,
    }
  })
}
