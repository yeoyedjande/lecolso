import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { enqueue, isNetworkError } from '@/lib/offline/outbox'

export type AttendanceClassroom = components['schemas']['AttendanceClassroomResource']
export type RollCall = components['schemas']['RollCallResource']
export type RollCallRow = components['schemas']['RollCallRowResource']
export type AttendanceDay = components['schemas']['AttendanceDayResource']
export type Absence = components['schemas']['AbsenceResource']
export type PlannedAbsence = components['schemas']['PlannedAbsenceResource']
export type DaycareBoard = components['schemas']['DaycareBoardResource']
export type DaycareLogKind = components['schemas']['DaycareLogRequest']['kind']
export type MarkStatus = 'present' | 'absent' | 'late'

function useAttendanceKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'attendance'] as const }
}

/** Classes de l'année que l'utilisateur voit pour les présences, avec leur mode (appel ou garderie). */
export function useAttendanceClassrooms() {
  const { school, key } = useAttendanceKey()
  return useQuery({
    queryKey: [...key, 'classrooms'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<AttendanceClassroom[]> => {
      const { data, error } = await api.GET('/attendance/classrooms', { signal })
      if (data === undefined) throw new Error('Classes indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Appel d'une classe pour un jour ; `null` si la classe est hors du périmètre (404). */
export function useRollCall(classroomId: string, date: string) {
  const { school, key } = useAttendanceKey()
  return useQuery({
    queryKey: [...key, 'call', classroomId, date],
    enabled: school !== null && classroomId !== '',
    queryFn: async ({ signal }): Promise<RollCall | null> => {
      const { data, error, response } = await api.GET('/classrooms/{classroom}/roll-calls/{date}', {
        params: { path: { classroom: classroomId, date } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Appel indisponible', { cause: error })
      return data.data
    },
  })
}

export interface SaveRollCallInput {
  classroomId: string
  date: string
  marks: { student_id: string; status: MarkStatus; late_minutes: number | null }[]
  reason: string | null
}

/**
 * Enregistre l'appel. Hors connexion (ou réseau coupé pendant l'envoi) : mis dans la file locale avec l'heure de
 * saisie, envoyé à POST /sync au retour du réseau ; renvoie alors `queued`.
 */
export function useSaveRollCall() {
  const { school, key } = useAttendanceKey()
  const queryClient = useQueryClient()
  return useMutation({
    // Hors connexion, la mutation s'exécute quand même : elle met la saisie dans la file locale
    networkMode: 'always',
    mutationFn: async (input: SaveRollCallInput): Promise<{ queued: boolean }> => {
      const body = {
        marks: input.marks,
        reason: input.reason,
        recorded_at: new Date().toISOString(),
      }
      const queue = async () => {
        if (school === null) throw new Error('Aucune école')
        await enqueue(school.id, 'attendance.roll_call', {
          ...body,
          classroom_id: input.classroomId,
          date: input.date,
        })
        return { queued: true }
      }
      if (!navigator.onLine) return queue()
      try {
        const { data, response } = await api.PUT('/classrooms/{classroom}/roll-calls/{date}', {
          params: { path: { classroom: input.classroomId, date: input.date } },
          body,
        })
        if (data === undefined)
          throw new Error(`Enregistrement impossible (${String(response.status)})`)
        queryClient.setQueryData([...key, 'call', input.classroomId, input.date], data.data)
        return { queued: false }
      } catch (error) {
        if (isNetworkError(error)) return queue()
        throw error
      }
    },
    onSuccess: async ({ queued }) => {
      if (!queued) await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Historique d'une classe (jours ouvrés de `from` à `to`). */
export function useAttendanceHistory(classroomId: string, from: string, to: string) {
  const { school, key } = useAttendanceKey()
  return useQuery({
    queryKey: [...key, 'history', classroomId, from, to],
    enabled: school !== null && classroomId !== '',
    queryFn: async ({ signal }): Promise<AttendanceDay[]> => {
      const { data, error } = await api.GET('/classrooms/{classroom}/attendance', {
        params: { path: { classroom: classroomId }, query: { from, to } },
        signal,
      })
      if (data === undefined) throw new Error('Historique indisponible', { cause: error })
      return data.data
    },
  })
}

/** Absences et retards d'un jour, ou justifications à traiter (`pending`). */
export function useAbsences(filter: { date: string | null; pending: boolean }) {
  const { school, key } = useAttendanceKey()
  return useQuery({
    queryKey: [...key, 'absences', filter],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<Absence[]> => {
      const { data, error } = await api.GET('/attendance/absences', {
        params: { query: { date: filter.date, pending: filter.pending ? true : null } },
        signal,
      })
      if (data === undefined) throw new Error('Absences indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Justification d'une absence par l'école (acceptée) ; motif et photo facultative. */
export function useJustifyAbsence() {
  const { key } = useAttendanceKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      markId,
      reason,
      proof,
    }: {
      markId: string
      reason: string
      proof: File | null
    }): Promise<Absence> => {
      const form = new FormData()
      form.append('reason', reason)
      if (proof !== null) form.append('proof', proof)
      // Corps réel : le formulaire multipart ci-dessus (motif et photo du certificat)
      const { data, response } = await api.POST('/attendance/marks/{mark}/justification', {
        params: { path: { mark: markId } },
        body: { reason },
        bodySerializer: () => form,
      })
      if (data === undefined)
        throw new Error(`Justification impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Accepter ou refuser la justification envoyée par un parent. */
export function useDecideJustification() {
  const { key } = useAttendanceKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      justificationId,
      accepted,
      note,
    }: {
      justificationId: string
      accepted: boolean
      note: string | null
    }): Promise<Absence> => {
      const { data, response } = await api.POST(
        '/attendance/justifications/{justification}/decision',
        {
          params: { path: { justification: justificationId } },
          body: { decision: accepted ? 'accepted' : 'refused', note },
        },
      )
      if (data === undefined) throw new Error(`Décision impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Absences annoncées par les parents : en cours ou à venir, ou celles à traiter (`pending`). */
export function usePlannedAbsences(pending = false) {
  const { school, key } = useAttendanceKey()
  return useQuery({
    queryKey: [...key, 'planned', pending],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<PlannedAbsence[]> => {
      const { data, error } = await api.GET('/attendance/planned-absences', {
        params: { query: { pending: pending ? true : null } },
        signal,
      })
      if (data === undefined) throw new Error('Absences annoncées indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Accepter ou refuser une absence annoncée (vaut aussi pour les absences relevées ces jours-là). */
export function useDecidePlannedAbsence() {
  const { key } = useAttendanceKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      plannedId,
      accepted,
    }: {
      plannedId: string
      accepted: boolean
    }): Promise<PlannedAbsence> => {
      const { data, response } = await api.POST(
        '/attendance/planned-absences/{plannedAbsence}/decision',
        {
          params: { path: { plannedAbsence: plannedId } },
          body: { decision: accepted ? 'accepted' : 'refused', note: null },
        },
      )
      if (data === undefined) throw new Error(`Décision impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Garderie du jour (classes en arrivées et départs). */
export function useDaycareBoard() {
  const { school, key } = useAttendanceKey()
  return useQuery({
    queryKey: [...key, 'daycare'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<DaycareBoard> => {
      const { data, error } = await api.GET('/daycare/board', { params: { query: {} }, signal })
      if (data === undefined) throw new Error('Garderie indisponible', { cause: error })
      return data.data
    },
  })
}

function todayInAbidjan(): string {
  // Abidjan est à UTC+0 toute l'année : la date UTC est celle de l'école
  return new Date().toISOString().slice(0, 10)
}

/** Garderie mise à jour localement par une saisie en attente d'envoi (même effet que la réponse de l'API). */
function withLocalDaycare(board: DaycareBoard, input: DaycareInput): DaycareBoard {
  return {
    ...board,
    classrooms: board.classrooms.map((classroom) => ({
      ...classroom,
      children: classroom.children.map((child) => {
        if (child.student.id !== input.studentId) return child
        if (input.kind === 'log') {
          return {
            ...child,
            logs: [
              ...child.logs,
              { id: crypto.randomUUID(), time: input.time, kind: input.logKind, note: input.note },
            ],
          }
        }
        const visit = child.visit ?? {
          arrived_at: null,
          left_at: null,
          dropped_by: null,
          picked_up_by: null,
        }
        return {
          ...child,
          visit:
            input.direction === 'in'
              ? { ...visit, arrived_at: input.time, dropped_by: input.person }
              : { ...visit, left_at: input.time, picked_up_by: input.person },
        }
      }),
    })),
  }
}

export type DaycareInput =
  | {
      kind: 'check'
      studentId: string
      direction: 'in' | 'out'
      time: string
      person: string | null
    }
  | { kind: 'log'; studentId: string; time: string; logKind: DaycareLogKind; note: string }

/** Arrivée, départ ou entrée du journal ; hors connexion : file locale, envoyée au retour du réseau. */
export function useDaycareRecord() {
  const { school, key } = useAttendanceKey()
  const queryClient = useQueryClient()
  return useMutation({
    // Hors connexion, la mutation s'exécute quand même : elle met la saisie dans la file locale
    networkMode: 'always',
    mutationFn: async (input: DaycareInput): Promise<{ queued: boolean }> => {
      const queue = async () => {
        if (school === null) throw new Error('Aucune école')
        const recorded = { date: todayInAbidjan(), recorded_at: new Date().toISOString() }
        await (input.kind === 'check'
          ? enqueue(school.id, 'daycare.check', {
              ...recorded,
              student_id: input.studentId,
              direction: input.direction,
              time: input.time,
              person: input.person,
            })
          : enqueue(school.id, 'daycare.log', {
              ...recorded,
              log_id: crypto.randomUUID(),
              student_id: input.studentId,
              time: input.time,
              kind: input.logKind,
              note: input.note,
            }))
        // Affichage immédiat : l'arrivée notée hors connexion permet de noter le départ pendant la même coupure
        queryClient.setQueryData<DaycareBoard>([...key, 'daycare'], (board) =>
          board === undefined ? board : withLocalDaycare(board, input),
        )
        return { queued: true }
      }
      if (!navigator.onLine) return queue()
      try {
        const { data, response } =
          input.kind === 'check'
            ? await api.POST('/daycare/visits', {
                body: {
                  student_id: input.studentId,
                  direction: input.direction,
                  time: input.time,
                  person: input.person,
                },
              })
            : await api.POST('/daycare/logs', {
                body: {
                  student_id: input.studentId,
                  time: input.time,
                  kind: input.logKind,
                  note: input.note,
                },
              })
        if (data === undefined)
          throw new Error(`Enregistrement impossible (${String(response.status)})`)
        queryClient.setQueryData([...key, 'daycare'], data.data)
        return { queued: false }
      } catch (error) {
        if (isNetworkError(error)) return queue()
        throw error
      }
    },
  })
}
