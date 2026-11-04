import type { DemoClassroom, DemoSchool, DemoStudent } from './types'

export function fullName(student: Pick<DemoStudent, 'firstName' | 'lastName'>): string {
  return `${student.lastName} ${student.firstName}`
}

export function classroomOf(school: DemoSchool, student: DemoStudent): DemoClassroom {
  const classroom = school.classrooms.find((candidate) => candidate.id === student.classroomId)
  if (classroom === undefined) throw new Error(`Classe introuvable : ${student.classroomId}`)
  return classroom
}

export function studentById(school: DemoSchool, id: string): DemoStudent | undefined {
  return school.students.find((student) => student.id === id)
}

export function studentsOf(school: DemoSchool, classroomId: string): DemoStudent[] {
  return school.students
    .filter((student) => student.classroomId === classroomId)
    .sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'))
}
