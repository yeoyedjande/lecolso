import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'

import {
  enroll,
  listStudents,
  studentDetail,
  type EnrollmentInput,
  type StudentFilters,
} from './demo'

export type StudentRow = components['schemas']['StudentRowResource']
export type StudentFile = components['schemas']['StudentResource']
export type StudentGuardian = components['schemas']['GuardianLinkResource']
export type StudentEnrollment = components['schemas']['EnrollmentResource']
export type EnrollStudentInput = components['schemas']['EnrollStudentRequest']
export type UpdateStudentInput = components['schemas']['UpdateStudentRequest']
export type UpdateEnrollmentInput = components['schemas']['UpdateEnrollmentRequest']
export type GuardianInput = components['schemas']['StoreGuardianRequest']
export type UpdateGuardianInput = components['schemas']['UpdateGuardianRequest']
export type GuardianRelation = components['schemas']['GuardianRelation']
export type BloodType = NonNullable<NonNullable<StudentFile['medical']>['blood_type']>

export const RELATIONS: readonly GuardianRelation[] = ['mother', 'father', 'guardian', 'other']
export const BLOOD_TYPES: readonly BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export type StudentStatus = 'active' | 'left' | 'all'

export interface StudentListFilters {
  search: string
  cycleId: string | null
  classroomId: string | null
  status: StudentStatus
}

function useStudentsKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'students'] as const }
}

const NO_CURSOR: string | null = null

/** Élèves de l'année en cours (vraie API), 25 par page, page suivante par curseur ; recherche côté serveur. */
export function useStudentList(filters: StudentListFilters) {
  const { school, key } = useStudentsKey()
  return useInfiniteQuery({
    queryKey: [...key, 'list', filters],
    enabled: school !== null,
    initialPageParam: NO_CURSOR,
    queryFn: async ({ pageParam, signal }: { pageParam: string | null; signal: AbortSignal }) => {
      const search = filters.search.trim()
      const { data, error } = await api.GET('/students', {
        params: {
          query: {
            search: search === '' ? null : search,
            cycle_id: filters.cycleId,
            classroom_id: filters.classroomId,
            status: filters.status,
            cursor: pageParam,
          },
        },
        signal,
      })
      if (data === undefined) throw new Error('Élèves indisponibles', { cause: error })
      return data
    },
    getNextPageParam: (page) => page.meta.next_cursor,
  })
}

/** Dossier d'un élève ; `null` s'il est introuvable (autre école, hors du périmètre, supprimé). */
export function useStudentFile(id: string) {
  const { school, key } = useStudentsKey()
  return useQuery({
    queryKey: [...key, 'file', id],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<StudentFile | null> => {
      const { data, error, response } = await api.GET('/students/{student}', {
        params: { path: { student: id } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Dossier indisponible', { cause: error })
      return data.data
    },
  })
}

/** Après une écriture : le dossier reçu remplace celui du cache ; listes et classes (inscrits) relues. */
function useSaveFile() {
  const { school, key } = useStudentsKey()
  const queryClient = useQueryClient()
  return async (file: StudentFile) => {
    queryClient.setQueryData([...key, 'file', file.id], file)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...key, 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['school', school?.id ?? null, 'classrooms'] }),
    ])
  }
}

export function useEnrollStudent() {
  const save = useSaveFile()
  return useMutation({
    mutationFn: async (input: EnrollStudentInput): Promise<StudentFile> => {
      const { data, response } = await api.POST('/enrollments', { body: input })
      if (data === undefined) throw new Error(`Inscription impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useUpdateStudent(id: string) {
  const save = useSaveFile()
  return useMutation({
    mutationFn: async (input: UpdateStudentInput): Promise<StudentFile> => {
      const { data, response } = await api.PATCH('/students/{student}', {
        params: { path: { student: id } },
        body: input,
      })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useUpdateEnrollment() {
  const save = useSaveFile()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdateEnrollmentInput
    }): Promise<StudentFile> => {
      const { data, response } = await api.PATCH('/enrollments/{enrollment}', {
        params: { path: { enrollment: id } },
        body: input,
      })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useAddGuardian(studentId: string) {
  const save = useSaveFile()
  return useMutation({
    mutationFn: async (input: GuardianInput): Promise<StudentFile> => {
      const { data, response } = await api.POST('/students/{student}/guardians', {
        params: { path: { student: studentId } },
        body: input,
      })
      if (data === undefined) throw new Error(`Ajout impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useUpdateGuardian(studentId: string) {
  const save = useSaveFile()
  return useMutation({
    mutationFn: async ({
      guardianId,
      input,
    }: {
      guardianId: string
      input: UpdateGuardianInput
    }): Promise<StudentFile> => {
      const { data, response } = await api.PATCH('/students/{student}/guardians/{guardian}', {
        params: { path: { student: studentId, guardian: guardianId } },
        body: input,
      })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useRemoveGuardian(studentId: string) {
  const save = useSaveFile()
  return useMutation({
    mutationFn: async (guardianId: string): Promise<StudentFile> => {
      const { data, response } = await api.DELETE('/students/{student}/guardians/{guardian}', {
        params: { path: { student: studentId, guardian: guardianId } },
      })
      if (data === undefined) throw new Error(`Retrait impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: save,
  })
}

export function useDeleteStudent() {
  const { school, key } = useStudentsKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { response } = await api.DELETE('/students/{student}', {
        params: { path: { student: id } },
      })
      if (!response.ok) throw new Error(`Suppression impossible (${String(response.status)})`)
    },
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: [...key, 'file', id] })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...key, 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['school', school?.id ?? null, 'classrooms'] }),
      ])
    },
  })
}

// --- Démonstration : encaissements, espace enseignant et import Excel (modules encore sans backend) ---

export function useDemoStudents(filters: StudentFilters) {
  return useDemoQuery(['students', 'list', filters], (school, today) =>
    listStudents(school, filters, today),
  )
}

export function useDemoStudent(id: string) {
  return useDemoQuery(['students', 'detail', id], (school, today) =>
    studentDetail(school, id, today),
  )
}

/** Import Excel : inscrit chaque ligne valide ; renvoie le nombre d'élèves créés. */
export function useImportStudents() {
  return useDemoMutation(
    (school, rows: EnrollmentInput[], today) =>
      rows.map((row) => enroll(school, row, today)).length,
  )
}

export type { EnrollmentInput, StudentFilters }
