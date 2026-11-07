import { useCycles } from '@/features/cycles/api'
import type { CycleCode } from '@/lib/cycles'

import { useCurrentSchool } from './useCurrentSchool'

/**
 * Cycles sur lesquels l'utilisateur détient une permission (rôles limités à un cycle).
 * undefined : tout l'établissement (ou pas encore connu). Le backend reste la vraie barrière.
 */
export function useAllowedCycles(permission: string): readonly CycleCode[] | undefined {
  const school = useCurrentSchool()
  const { data: cycles } = useCycles()
  const scope = school?.permissions[permission]
  if (scope === undefined || scope === null || cycles === undefined) return undefined
  return cycles
    .filter((cycle) => scope.includes(cycle.id))
    .map((cycle) => cycle.code)
    .filter(
      (code): code is CycleCode =>
        code === 'daycare' || code === 'kindergarten' || code === 'primary',
    )
}
