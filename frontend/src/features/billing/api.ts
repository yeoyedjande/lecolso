import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import { fullName } from '@/lib/demo/lookup'
import type { FeeKind } from '@/lib/demo/types'

import {
  cashDesk,
  recordPayment,
  schedules,
  unpaid,
  updateFee,
  type RecordPaymentInput,
} from './demo'

export function useUnpaid() {
  return useDemoQuery(['billing', 'unpaid'], (school, today) => unpaid(school, today))
}

export function useCashDesk(date?: string) {
  return useDemoQuery(['billing', 'cash', date ?? 'today'], (school, today) =>
    cashDesk(school, date ?? today),
  )
}

export function useSchedules() {
  return useDemoQuery(['billing', 'schedules'], (school) => schedules(school))
}

export function useFees() {
  return useDemoQuery(['billing', 'fees'], (school) => ({
    levels: school.levels,
    fees: school.fees.map((fee) => ({ ...fee })),
  }))
}

export function useUpdateFee() {
  return useDemoMutation((school, input: { levelCode: string; kind: FeeKind; amount: number }) => {
    updateFee(school, input.levelCode, input.kind, input.amount)
  })
}

export function useRecordPayment() {
  return useDemoMutation((school, input: RecordPaymentInput) =>
    recordPayment(school, input, new Date()),
  )
}

/** Reçu imprimable : paiement, élève, payeur, école. */
export function useReceipt(paymentId: string) {
  return useDemoQuery(['billing', 'receipt', paymentId], (school) => {
    const payment = school.payments.find((p) => p.id === paymentId)
    if (payment === undefined) return null
    const student = school.students.find((s) => s.id === payment.studentId)
    const classroom = school.classrooms.find((c) => c.id === student?.classroomId)
    const paid = school.payments
      .filter((p) => p.studentId === payment.studentId && p.paidAt <= payment.paidAt)
      .reduce((sum, p) => sum + p.amount, 0)
    const expected = school.installments
      .filter((i) => i.studentId === payment.studentId)
      .reduce((sum, i) => sum + i.amount, 0)
    return {
      payment,
      studentName: student === undefined ? '' : fullName(student),
      matricule: student?.matricule ?? '',
      classroom: classroom?.name ?? '',
      payer: (student?.guardians.find((g) => g.isPayer) ?? student?.guardians[0])?.name ?? '',
      remaining: Math.max(0, expected - paid),
      school: {
        name: school.name,
        address: school.address,
        phone: school.phone,
        year: school.year,
      },
    }
  })
}

/** Relance des impayés (simulée : SMS au payeur). */
export function useRemind() {
  return useDemoMutation((_school, studentIds: string[]) => studentIds.length)
}

export type { RecordPaymentInput }
