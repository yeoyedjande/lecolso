import { useDemoQuery } from '@/lib/demo/hooks'

import { classroomsByLevel } from './demo'

export function useClassrooms() {
  return useDemoQuery(['classes'], (school) => classroomsByLevel(school))
}

/** Liste simple des classes (sélecteurs), triée par niveau. */
export function useClassroomOptions() {
  return useDemoQuery(['classes', 'options'], (school) =>
    [...school.classrooms].sort(
      (a, b) =>
        (school.levels.find((l) => l.code === a.levelCode)?.position ?? 0) -
          (school.levels.find((l) => l.code === b.levelCode)?.position ?? 0) || a.name.localeCompare(b.name),
    ),
  )
}
