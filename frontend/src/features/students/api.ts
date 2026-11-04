import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'

import { enroll, listStudents, studentDetail, type EnrollmentInput, type StudentFilters } from './demo'

export function useStudents(filters: StudentFilters) {
  return useDemoQuery(['students', 'list', filters], (school, today) => listStudents(school, filters, today))
}

export function useStudent(id: string) {
  return useDemoQuery(['students', 'detail', id], (school, today) => studentDetail(school, id, today))
}

export function useEnroll() {
  return useDemoMutation((school, input: EnrollmentInput, today) => enroll(school, input, today))
}

/** Import Excel : inscrit chaque ligne valide ; renvoie le nombre d'élèves créés. */
export function useImportStudents() {
  return useDemoMutation((school, rows: EnrollmentInput[], today) => rows.map((row) => enroll(school, row, today)).length)
}

export type { EnrollmentInput, StudentFilters }
