import { balanceOf, type Balance } from '@/features/billing/demo'
import { classResults } from '@/features/grades/demo'
import { installmentsFor } from '@/lib/demo/dataset'
import { classroomOf, fullName, studentById } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type {
  CycleCode,
  DemoAttendance,
  DemoClassroom,
  DemoPayment,
  DemoSchool,
  DemoStudent,
  FeeKind,
  Gender,
} from '@/lib/demo/types'

export interface StudentFilters {
  search?: string | undefined
  cycle?: CycleCode | undefined
  classroomId?: string | undefined
  /** Cycles visibles (droits limités à un cycle) ; undefined = tous. */
  allowedCycles?: readonly CycleCode[] | undefined
}

export interface StudentRow {
  student: DemoStudent
  name: string
  classroom: DemoClassroom
  payer: string
  overdue: number
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function listStudents(
  school: DemoSchool,
  filters: StudentFilters,
  today: string,
): StudentRow[] {
  const query = normalize(filters.search?.trim() ?? '')
  return school.students
    .map((student) => ({ student, classroom: classroomOf(school, student) }))
    .filter(
      ({ classroom }) =>
        filters.allowedCycles === undefined || filters.allowedCycles.includes(classroom.cycle),
    )
    .filter(({ classroom }) => filters.cycle === undefined || classroom.cycle === filters.cycle)
    .filter(
      ({ student }) =>
        filters.classroomId === undefined || student.classroomId === filters.classroomId,
    )
    .filter(
      ({ student }) =>
        query === '' ||
        normalize(`${student.firstName} ${student.lastName} ${student.matricule}`).includes(
          query,
        ) ||
        student.guardians.some(
          (guardian) =>
            normalize(guardian.name).includes(query) ||
            guardian.phone.includes(query.replace(/\s/g, '')),
        ),
    )
    .map(({ student, classroom }) => ({
      student,
      classroom,
      name: fullName(student),
      payer: (student.guardians.find((g) => g.isPayer) ?? student.guardians[0])?.name ?? '',
      overdue: balanceOf(school, student.id, today).overdue,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export interface StudentDetail {
  student: DemoStudent
  name: string
  classroom: DemoClassroom
  balance: Balance
  installments: (ReturnType<typeof installmentsFor>[number] & { paid: number })[]
  payments: DemoPayment[]
  attendance: DemoAttendance[]
  results: {
    average: number | null
    rank: { rank: number; tied: boolean } | null
    size: number
    bySubject: { name: string; coefficient: number; average: number | null }[]
  } | null
  skills: { domain: string; label: string; level: string | null }[]
}

export function studentDetail(school: DemoSchool, id: string, today: string): StudentDetail | null {
  const student = studentById(school, id)
  if (student === undefined) return null
  const classroom = classroomOf(school, student)
  const payments = school.payments
    .filter((p) => p.studentId === id)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  let remaining = payments.reduce((sum, p) => sum + p.amount, 0)
  const installments = school.installments
    .filter((i) => i.studentId === id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((installment) => {
      const paid = Math.min(remaining, installment.amount)
      remaining -= paid
      return { ...installment, paid }
    })
  let results: StudentDetail['results'] = null
  if (classroom.cycle === 'primary') {
    const all = classResults(school, classroom.id, 1)
    const row = all.rows.find((r) => r.student.id === id)
    results = {
      average: row?.average ?? null,
      rank: row?.rank ?? null,
      size: all.rows.length,
      bySubject: all.subjects.map((subject) => ({
        name: subject.name,
        coefficient: subject.coefficient,
        average: row?.bySubject[subject.code] ?? null,
      })),
    }
  }
  return {
    student,
    name: fullName(student),
    classroom,
    balance: balanceOf(school, id, today),
    installments,
    payments,
    attendance: school.attendance
      .filter((a) => a.studentId === id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    results,
    skills: school.skills.map((skill) => ({
      domain: skill.domain,
      label: skill.label,
      level:
        school.skillEvaluations.find((e) => e.skillId === skill.id && e.studentId === id)?.level ??
        null,
    })),
  }
}

export interface EnrollmentInput {
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string
  district: string
  medicalNote: string | null
  classroomId: string
  options: FeeKind[]
  guardians: {
    name: string
    relation: 'Père' | 'Mère' | 'Tuteur' | 'Tutrice'
    phone: string
    profession: string
    isPayer: boolean
  }[]
}

/** Inscription : crée l'élève, ses tuteurs et ses échéances selon la grille du niveau. */
export function enroll(school: DemoSchool, input: EnrollmentInput, today: string): DemoStudent {
  const classroom = school.classrooms.find((c) => c.id === input.classroomId)
  if (classroom === undefined) throw new Error('Classe introuvable')
  const sequence = school.students.length + 1
  const code = school.students[0]?.matricule.slice(0, 3) ?? 'ECO'
  const id = demoId('el')
  const student: DemoStudent = {
    id,
    matricule: `${code}-2026-${String(sequence).padStart(4, '0')}`,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    gender: input.gender,
    birthDate: input.birthDate,
    classroomId: classroom.id,
    district: input.district,
    enrolledAt: today,
    status: 'enrolled',
    medicalNote: input.medicalNote,
    options: input.options,
    guardians: input.guardians.map((guardian, index) => ({
      ...guardian,
      id: `${id}-g${String(index + 1)}`,
    })),
  }
  school.students.push(student)
  school.installments.push(...installmentsFor(student, school.fees, classroom.levelCode))
  school.activity.unshift({
    id: demoId('act'),
    at: new Date().toISOString(),
    kind: 'enrollment',
    label: '',
    studentId: id,
  })
  return student
}

/** Moyenne de présence d'un élève (pour la fiche) : part des jours sans absence. */
export function absenceCount(detail: StudentDetail): {
  absent: number
  late: number
  unjustified: number
} {
  return {
    absent: detail.attendance.filter((a) => a.status === 'absent' || a.status === 'excused').length,
    late: detail.attendance.filter((a) => a.status === 'late').length,
    unjustified: detail.attendance.filter((a) => a.status === 'absent' && !a.justified).length,
  }
}
