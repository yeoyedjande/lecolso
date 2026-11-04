import { useClassroomOptions } from '@/features/classes/api'
import { useAllowedCycles } from '@/features/auth/useAllowedCycles'
import { useCycleSettings } from '@/features/cycles/useCycleSettings'
import type { CycleSettings } from '@/features/cycles/api'
import type { DemoClassroom } from '@/lib/demo/types'

/**
 * Classes concernées par un écran pédagogique, d'après les paramètres de leur cycle (assessment_mode,
 * report_document…) et les cycles autorisés pour l'utilisateur.
 */
export function usePedagogyClasses(
  permission: string,
  matches: (settings: CycleSettings) => boolean,
): { classrooms: DemoClassroom[]; settingsOf: (classroom: DemoClassroom | undefined) => CycleSettings | undefined; loading: boolean } {
  const classes = useClassroomOptions()
  const { settings, loading } = useCycleSettings()
  const allowed = useAllowedCycles(permission)
  const classrooms = (classes.data ?? []).filter((classroom) => {
    const cycleSettings = settings[classroom.cycle]
    return cycleSettings !== undefined && matches(cycleSettings) && (allowed === undefined || allowed.includes(classroom.cycle))
  })
  return {
    classrooms,
    settingsOf: (classroom) => (classroom === undefined ? undefined : settings[classroom.cycle]),
    loading: loading || classes.isPending,
  }
}
