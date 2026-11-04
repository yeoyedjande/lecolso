import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import type { DaycareLogKind } from '@/lib/demo/types'

import {
  absencesOn,
  addDaycareLog,
  checkIn,
  checkOut,
  daycareBoard,
  history,
  rollCall,
  saveRollCall,
  type RollCallInput,
} from './demo'

export function useRollCall(classroomId: string, date?: string) {
  return useDemoQuery(['attendance', 'call', classroomId, date ?? 'today'], (school, today) =>
    rollCall(school, classroomId, date ?? today),
  )
}

export function useSaveRollCall() {
  return useDemoMutation((school, input: RollCallInput) => {
    saveRollCall(school, input, new Date())
  })
}

export function useAttendanceHistory(classroomId: string, from: string, to: string) {
  return useDemoQuery(['attendance', 'history', classroomId, from, to], (school) =>
    history(school, classroomId, from, to),
  )
}

export function useAbsences(date?: string) {
  return useDemoQuery(['attendance', 'absences', date ?? 'today'], (school, today) =>
    absencesOn(school, date ?? today),
  )
}

export function useDaycareBoard() {
  return useDemoQuery(['attendance', 'daycare'], (school, today) => daycareBoard(school, today))
}

export function useDaycareCheck() {
  return useDemoMutation(
    (
      school,
      input: { studentId: string; direction: 'in' | 'out'; time: string; by: string },
      today,
    ) => {
      if (input.direction === 'in') checkIn(school, input.studentId, today, input.time, input.by)
      else checkOut(school, input.studentId, today, input.time, input.by)
    },
  )
}

export function useAddDaycareLog() {
  return useDemoMutation(
    (
      school,
      input: { studentId: string; time: string; kind: DaycareLogKind; note: string },
      today,
    ) => addDaycareLog(school, { ...input, date: today }),
  )
}

export type { RollCallInput }
