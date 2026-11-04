import type { DemoClassroom, DemoLevel, DemoSchool } from '@/lib/demo/types'

export interface ClassroomSummary extends DemoClassroom {
  students: number
  girls: number
  boys: number
}

export function classroomsByLevel(
  school: DemoSchool,
): { level: DemoLevel; classrooms: ClassroomSummary[] }[] {
  return school.levels.map((level) => ({
    level,
    classrooms: school.classrooms
      .filter((classroom) => classroom.levelCode === level.code)
      .map((classroom) => {
        const pupils = school.students.filter((student) => student.classroomId === classroom.id)
        return {
          ...classroom,
          students: pupils.length,
          girls: pupils.filter((student) => student.gender === 'F').length,
          boys: pupils.filter((student) => student.gender === 'M').length,
        }
      }),
  }))
}
