import { balanceOf, recordPayment, type Balance } from '@/features/billing/demo'
import { classResults } from '@/features/grades/demo'
import { reply } from '@/features/messaging/demo'
import { HOLIDAYS } from '@/lib/demo/dataset'
import { schoolDays } from '@/lib/demo/dates'
import { studentDetail, type StudentDetail } from '@/features/students/demo'
import { classroomOf, fullName } from '@/lib/demo/lookup'
import type {
  DemoAnnouncement,
  DemoClassroom,
  DemoConversation,
  DemoDaycareLog,
  DemoDaycareVisit,
  DemoPayment,
  DemoSchool,
  DemoStudent,
  PaymentMethod,
} from '@/lib/demo/types'

/**
 * Espace parent : uniquement les enfants dont le parent connecté est tuteur (rapprochement par téléphone E.164,
 * le même que celui du compte). Toute lecture d'un autre enfant renvoie null.
 */
export function isChildOf(student: DemoStudent, phone: string): boolean {
  return student.guardians.some((guardian) => guardian.phone === phone)
}

export interface ChildCard {
  student: DemoStudent
  name: string
  classroom: DemoClassroom
  balance: Balance
  average: number | null
  absences: number
  unjustified: number
  daycare: DemoDaycareVisit | null
}

export function myChildren(school: DemoSchool, phone: string, today: string): ChildCard[] {
  return school.students
    .filter((student) => isChildOf(student, phone))
    .map((student) => {
      const classroom = classroomOf(school, student)
      const own = school.attendance.filter(
        (a) => a.studentId === student.id && (a.status === 'absent' || a.status === 'excused'),
      )
      return {
        student,
        name: fullName(student),
        classroom,
        balance: balanceOf(school, student.id, today),
        average:
          classroom.cycle === 'primary'
            ? (classResults(school, classroom.id, 1).rows.find(
                (row) => row.student.id === student.id,
              )?.average ?? null)
            : null,
        absences: own.length,
        unjustified: own.filter((a) => !a.justified).length,
        daycare:
          school.daycareVisits.find((v) => v.studentId === student.id && v.date === today) ?? null,
      }
    })
}

export interface ChildDetail extends StudentDetail {
  daycareLogs: DemoDaycareLog[]
}

export function childDetail(
  school: DemoSchool,
  phone: string,
  studentId: string,
  today: string,
): ChildDetail | null {
  const student = school.students.find((candidate) => candidate.id === studentId)
  if (student === undefined || !isChildOf(student, phone)) return null
  const detail = studentDetail(school, studentId, today)
  if (detail === null) return null
  return {
    ...detail,
    daycareLogs: school.daycareLogs
      .filter((log) => log.studentId === studentId && log.date === today)
      .sort((a, b) => a.time.localeCompare(b.time)),
  }
}

export const JUSTIFY_REASONS = ['illness', 'medical', 'family', 'other'] as const
export type JustifyReason = (typeof JUSTIFY_REASONS)[number]

/**
 * Justification d'absence par le parent : les absences des jours indiqués deviennent excusées ; un jour sans absence
 * enregistrée (absence prévue) est ajouté comme absence excusée. Renvoie le nombre de jours justifiés.
 */
export function justifyAbsence(
  school: DemoSchool,
  input: {
    phone: string
    studentId: string
    from: string
    to: string
    reason: JustifyReason
    comment: string
  },
): number {
  const student = school.students.find((candidate) => candidate.id === input.studentId)
  if (student === undefined || !isChildOf(student, input.phone))
    throw new Error('Enfant introuvable')
  if (!isDay(input.from) || !isDay(input.to) || input.to < input.from)
    throw new Error('Période invalide')
  // Jours de classe uniquement (ni week-end ni vacances), calculés avant toute écriture
  const days = schoolDays(input.from, input.to, HOLIDAYS)
  for (const date of days) {
    const entry = school.attendance.find((a) => a.studentId === student.id && a.date === date)
    if (entry === undefined)
      school.attendance.push({ studentId: student.id, date, status: 'excused', justified: true })
    else {
      entry.status = entry.status === 'late' ? 'late' : 'excused'
      entry.justified = true
    }
  }
  return days.length
}

/** Date AAAA-MM-JJ valide. */
export function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Absences de l'enfant à justifier (non justifiées), les plus récentes d'abord. */
export function absencesToJustify(
  school: DemoSchool,
  phone: string,
): { student: DemoStudent; name: string; date: string }[] {
  return school.attendance
    .filter((a) => a.status === 'absent' && !a.justified)
    .flatMap((a) => {
      const student = school.students.find((candidate) => candidate.id === a.studentId)
      return student !== undefined && isChildOf(student, phone)
        ? [{ student, name: fullName(student), date: a.date }]
        : []
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Annonces qui concernent un des enfants : toute l'école, leur cycle ou leur classe. */
export function relevantAnnouncements(
  announcements: readonly DemoAnnouncement[],
  children: readonly Pick<ChildCard, 'classroom'>[],
): DemoAnnouncement[] {
  return announcements.filter(
    (announcement) =>
      announcement.audience === 'all' ||
      children.some(
        (child) =>
          announcement.audience === child.classroom.cycle ||
          announcement.audience === `class:${child.classroom.id}`,
      ),
  )
}

export const MOBILE_OPERATORS: PaymentMethod[] = ['orange_money', 'mtn_momo', 'moov_money', 'wave']

/** Paiement Mobile Money (simulé en démonstration) : un reçu numéroté comme au guichet. */
export function payMobile(
  school: DemoSchool,
  input: {
    phone: string
    studentId: string
    amount: number
    operator: PaymentMethod
    walletPhone: string
  },
  now: Date,
): DemoPayment {
  const student = school.students.find((candidate) => candidate.id === input.studentId)
  if (student === undefined || !isChildOf(student, input.phone))
    throw new Error('Enfant introuvable')
  if (!MOBILE_OPERATORS.includes(input.operator)) throw new Error('Opérateur inconnu')
  return recordPayment(
    school,
    {
      studentId: student.id,
      amount: input.amount,
      method: input.operator,
      reference: `MM${String(now.getTime()).slice(-8)}`,
      cashier: 'Paiement mobile',
    },
    now,
  )
}

export function parentPayments(
  school: DemoSchool,
  phone: string,
): (DemoPayment & { childName: string })[] {
  return school.payments
    .flatMap((payment) => {
      const student = school.students.find((candidate) => candidate.id === payment.studentId)
      return student !== undefined && isChildOf(student, phone)
        ? [{ ...payment, childName: fullName(student) }]
        : []
    })
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
}

export function parentConversations(
  school: DemoSchool,
  phone: string,
): (DemoConversation & { childName: string; lastAt: string })[] {
  return school.conversations
    .filter((conversation) => conversation.guardianPhone === phone)
    .map((conversation) => {
      const student = school.students.find((candidate) => candidate.id === conversation.studentId)
      return {
        ...conversation,
        messages: [...conversation.messages],
        childName: student === undefined ? '' : fullName(student),
        lastAt: conversation.messages[conversation.messages.length - 1]?.sentAt ?? '',
      }
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/** Réponse d'un parent (seulement dans ses propres conversations). */
export function parentReply(
  school: DemoSchool,
  input: { phone: string; conversationId: string; body: string; author: string },
  now: Date,
): void {
  const conversation = school.conversations.find((c) => c.id === input.conversationId)
  if (conversation?.guardianPhone !== input.phone) throw new Error('Conversation introuvable')
  reply(school, input.conversationId, input.body, input.author, now)
  const last = conversation.messages[conversation.messages.length - 1]
  if (last !== undefined) last.from = 'guardian'
}
