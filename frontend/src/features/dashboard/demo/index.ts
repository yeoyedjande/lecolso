import { balanceOf } from '@/features/billing/demo'
import { absencesOn, attendanceRate } from '@/features/attendance/demo'
import { classroomOf, fullName, studentById } from '@/lib/demo/lookup'
import type { CycleCode, DemoActivity, DemoSchool } from '@/lib/demo/types'

export interface DashboardSummary {
  today: string
  students: number
  byCycle: { cycle: CycleCode; students: number; classrooms: number }[]
  month: { collected: number; expected: number; overdue: number }
  collectionRate: number
  absentToday: number
  lateToday: number
  rollCallsMissing: number
  monthly: { month: string; collected: number }[]
  attendance: { date: string; rate: number }[]
  activity: (DemoActivity & { studentName: string | null; classroom: string | null; amount: number | null })[]
}

const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06']

export function dashboard(school: DemoSchool, today: string): DashboardSummary {
  const month = today.slice(0, 7)
  const collected = school.payments.filter((p) => p.paidAt.startsWith(month)).reduce((sum, p) => sum + p.amount, 0)
  const expected = school.installments.filter((i) => i.dueDate.startsWith(month)).reduce((sum, i) => sum + i.amount, 0)
  const overdue = school.students.reduce((sum, student) => sum + balanceOf(school, student.id, today).overdue, 0)
  const dueToDate = school.installments.filter((i) => i.dueDate <= today).reduce((sum, i) => sum + i.amount, 0)
  const paidTotal = school.payments.reduce((sum, p) => sum + p.amount, 0)
  const absences = absencesOn(school, today)
  return {
    today,
    students: school.students.length,
    byCycle: school.cycles.map((cycle) => ({
      cycle,
      students: school.students.filter((s) => classroomOf(school, s).cycle === cycle).length,
      classrooms: school.classrooms.filter((c) => c.cycle === cycle).length,
    })),
    month: { collected, expected, overdue },
    collectionRate: dueToDate === 0 ? 100 : Math.min(100, Math.round((paidTotal / dueToDate) * 100)),
    absentToday: absences.filter((a) => a.status === 'absent' || a.status === 'excused').length,
    lateToday: absences.filter((a) => a.status === 'late').length,
    rollCallsMissing: school.classrooms.filter((c) => !school.rollCalls.some((call) => call.classroomId === c.id && call.date === today)).length,
    monthly: MONTHS.filter((m) => m <= month).map((m) => ({
      month: m,
      collected: school.payments.filter((p) => p.paidAt.startsWith(m)).reduce((sum, p) => sum + p.amount, 0),
    })),
    attendance: attendanceRate(school, today, 10),
    activity: school.activity.slice(0, 8).map((entry) => {
      const student = entry.studentId === null ? undefined : studentById(school, entry.studentId)
      const payment = entry.kind === 'payment' ? school.payments.find((p) => p.receiptNumber === entry.label) : undefined
      return {
        ...entry,
        studentName: student === undefined ? null : fullName(student),
        classroom: student === undefined ? null : classroomOf(school, student).name,
        amount: payment?.amount ?? null,
      }
    }),
  }
}
