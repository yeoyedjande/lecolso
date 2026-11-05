import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'

import type { DaycareLogKind } from '@/lib/demo/types'

import {
  addDaycareLog,
  checkIn,
  checkOut,
  daycareBoard,
  rollCall,
  saveRollCall,
  type RollCallInput,
} from './demo'

/** Démonstration (espace enseignant jusqu'au lot 8). */
export function useDemoRollCall(classroomId: string, date?: string) {
  return useDemoQuery(['attendance', 'call', classroomId, date ?? 'today'], (school, today) =>
    rollCall(school, classroomId, date ?? today),
  )
}

export function useDemoSaveRollCall() {
  return useDemoMutation((school, input: RollCallInput) => {
    saveRollCall(school, input, new Date())
  })
}

export function useDemoDaycareBoard(classroomIds: readonly string[]) {
  return useDemoQuery(['attendance', 'daycare', classroomIds], (school, today) =>
    daycareBoard(school, today, classroomIds),
  )
}

export function useDemoDaycareCheck() {
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

export function useDemoAddDaycareLog() {
  return useDemoMutation(
    (
      school,
      input: { studentId: string; time: string; kind: DaycareLogKind; note: string },
      today,
    ) => addDaycareLog(school, { ...input, date: today }),
  )
}

export type { RollCallInput }
