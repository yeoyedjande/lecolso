import { YEAR_START } from '@/lib/demo/dates'
import { classroomOf, fullName, studentById } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type {
  CycleCode,
  DemoInstallment,
  DemoPayment,
  DemoSchool,
  DemoStudent,
  FeeKind,
  PaymentMethod,
} from '@/lib/demo/types'

export interface Balance {
  /** Total attendu sur l'année (toutes les échéances). */
  expected: number
  /** Échu à ce jour. */
  dueToDate: number
  paid: number
  /** Reste à payer sur l'année. */
  remaining: number
  /** Retard : échu non payé. */
  overdue: number
  nextInstallment: DemoInstallment | null
}

export function balanceOf(school: DemoSchool, studentId: string, today: string): Balance {
  const installments = school.installments
    .filter((installment) => installment.studentId === studentId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const paid = school.payments
    .filter((payment) => payment.studentId === studentId)
    .reduce((sum, payment) => sum + payment.amount, 0)
  const expected = installments.reduce((sum, installment) => sum + installment.amount, 0)
  const dueToDate = installments
    .filter((installment) => installment.dueDate <= today)
    .reduce((sum, i) => sum + i.amount, 0)
  // Les paiements soldent les échéances dans l'ordre : la prochaine est la première non couverte
  let covered = paid
  let nextInstallment: DemoInstallment | null = null
  for (const installment of installments) {
    if (covered >= installment.amount) {
      covered -= installment.amount
      continue
    }
    nextInstallment = installment
    break
  }
  return {
    expected,
    dueToDate,
    paid,
    remaining: Math.max(0, expected - paid),
    overdue: Math.max(0, dueToDate - paid),
    nextInstallment,
  }
}

export interface UnpaidRow {
  student: DemoStudent
  classroom: string
  cycle: CycleCode
  payerName: string
  payerPhone: string
  overdue: number
  remaining: number
  daysLate: number
}

export function unpaid(school: DemoSchool, today: string): UnpaidRow[] {
  const rows: UnpaidRow[] = []
  for (const student of school.students) {
    const balance = balanceOf(school, student.id, today)
    if (balance.overdue <= 0) continue
    const payer = student.guardians.find((guardian) => guardian.isPayer) ?? student.guardians[0]
    const classroom = classroomOf(school, student)
    const firstLate = school.installments
      .filter((installment) => installment.studentId === student.id && installment.dueDate <= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
    rows.push({
      student,
      classroom: classroom.name,
      cycle: classroom.cycle,
      payerName: payer?.name ?? '',
      payerPhone: payer?.phone ?? '',
      overdue: balance.overdue,
      remaining: balance.remaining,
      daysLate:
        firstLate === undefined
          ? 0
          : Math.max(
              0,
              Math.round((Date.parse(today) - Date.parse(firstLate.dueDate)) / 86_400_000),
            ),
    })
  }
  return rows.sort((a, b) => b.overdue - a.overdue)
}

export interface CashDesk {
  date: string
  payments: (DemoPayment & { studentName: string; classroom: string })[]
  total: number
  byMethod: { method: PaymentMethod; total: number; count: number }[]
}

export function cashDesk(school: DemoSchool, date: string): CashDesk {
  const payments = school.payments
    .filter((payment) => payment.paidAt.startsWith(date))
    .map((payment) => {
      const student = studentById(school, payment.studentId)
      return {
        ...payment,
        studentName: student === undefined ? '' : fullName(student),
        classroom: student === undefined ? '' : classroomOf(school, student).name,
      }
    })
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  const methods = new Map<PaymentMethod, { total: number; count: number }>()
  for (const payment of payments) {
    const entry = methods.get(payment.method) ?? { total: 0, count: 0 }
    methods.set(payment.method, { total: entry.total + payment.amount, count: entry.count + 1 })
  }
  return {
    date,
    payments,
    total: payments.reduce((sum, payment) => sum + payment.amount, 0),
    byMethod: [...methods]
      .map(([method, value]) => ({ method, ...value }))
      .sort((a, b) => b.total - a.total),
  }
}

export interface RecordPaymentInput {
  studentId: string
  amount: number
  method: PaymentMethod
  reference: string | null
  cashier: string
}

/** Encaissement : numéro de reçu séquentiel par école et par année (REC-2026-000123). */
export function recordPayment(
  school: DemoSchool,
  input: RecordPaymentInput,
  now: Date,
): DemoPayment {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('Montant invalide')
  if (studentById(school, input.studentId) === undefined) throw new Error('Élève introuvable')
  school.receiptSequence += 1
  const payment: DemoPayment = {
    id: demoId('pay'),
    studentId: input.studentId,
    amount: input.amount,
    method: input.method,
    reference: input.reference,
    cashier: input.cashier,
    paidAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    receiptNumber: `REC-2026-${String(school.receiptSequence).padStart(6, '0')}`,
  }
  school.payments.push(payment)
  school.activity.unshift({
    id: demoId('act'),
    at: payment.paidAt,
    kind: 'payment',
    label: payment.receiptNumber,
    studentId: payment.studentId,
  })
  return payment
}

export interface ScheduleRow {
  label: string
  kind: FeeKind
  dueDate: string
  expected: number
  collected: number
  students: number
}

/** Échéancier : pour chaque échéance, montant attendu et part encaissée (paiements imputés dans l'ordre des échéances). */
export function schedules(school: DemoSchool): ScheduleRow[] {
  const collectedById = new Map<string, number>()
  for (const student of school.students) {
    let paid = school.payments
      .filter((payment) => payment.studentId === student.id)
      .reduce((sum, p) => sum + p.amount, 0)
    const own = school.installments
      .filter((installment) => installment.studentId === student.id)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    for (const installment of own) {
      const part = Math.min(paid, installment.amount)
      collectedById.set(installment.id, part)
      paid -= part
    }
  }
  const rows = new Map<string, ScheduleRow>()
  for (const installment of school.installments) {
    // L'inscription se paie à l'entrée (dates variables) : une seule ligne, datée de la rentrée
    const registration = installment.kind === 'registration'
    const key = registration ? 'registration' : `${installment.kind}|${installment.dueDate}`
    const row = rows.get(key) ?? {
      label: installment.label,
      kind: installment.kind,
      dueDate: registration ? YEAR_START : installment.dueDate,
      expected: 0,
      collected: 0,
      students: 0,
    }
    row.expected += installment.amount
    row.collected += collectedById.get(installment.id) ?? 0
    row.students += 1
    rows.set(key, row)
  }
  return [...rows.values()].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.kind.localeCompare(b.kind),
  )
}

export function updateFee(
  school: DemoSchool,
  levelCode: string,
  kind: FeeKind,
  amount: number,
): void {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Montant invalide')
  const fee = school.fees.find(
    (candidate) => candidate.levelCode === levelCode && candidate.kind === kind,
  )
  if (fee === undefined) throw new Error('Frais introuvable')
  fee.amount = amount
}
