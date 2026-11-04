import { useDemoQuery } from '@/lib/demo/hooks'

import { dashboard } from './demo'

/** Tableau de bord (démonstration tant que les modules élèves, paiements et présences n'ont pas d'API). */
export function useDashboard() {
  return useDemoQuery(['dashboard'], (school, today) => dashboard(school, today))
}
