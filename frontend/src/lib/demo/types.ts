/**
 * Données de démonstration des modules dont l'API n'existe pas encore (élèves, paiements, notes, présences…).
 * Ces types sont provisoires : quand un module backend arrivera, ses types viendront de lib/api/schema.d.ts
 * et seuls les hooks de features/<domaine>/api.ts changeront.
 */
import type { CycleTone } from '@/lib/cycles'

export type CycleCode = Exclude<CycleTone, 'other'>
export type Gender = 'F' | 'M'

export interface DemoLevel {
  code: string
  name: string
  cycle: CycleCode
  position: number
}

export interface DemoClassroom {
  id: string
  name: string
  levelCode: string
  cycle: CycleCode
  capacity: number
  teacher: string
  room: string
}

export interface DemoGuardian {
  id: string
  name: string
  relation: 'Père' | 'Mère' | 'Tuteur' | 'Tutrice'
  phone: string
  profession: string
  isPayer: boolean
}

export interface DemoStudent {
  id: string
  matricule: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string
  classroomId: string
  district: string
  enrolledAt: string
  status: 'enrolled' | 'pending'
  medicalNote: string | null
  guardians: DemoGuardian[]
  options: FeeKind[]
}

export type FeeKind = 'registration' | 'tuition' | 'canteen' | 'transport' | 'daycare'

export interface DemoFee {
  levelCode: string
  kind: FeeKind
  amount: number
  /** Nombre d'échéances (1 = paiement unique). */
  installments: number
  optional: boolean
}

export interface DemoInstallment {
  id: string
  studentId: string
  kind: FeeKind
  label: string
  dueDate: string
  amount: number
}

export type PaymentMethod =
  'cash' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave' | 'cheque' | 'transfer'

export interface DemoPayment {
  id: string
  studentId: string
  amount: number
  method: PaymentMethod
  paidAt: string
  receiptNumber: string
  cashier: string
  reference: string | null
}

export interface DemoSubject {
  code: string
  name: string
  coefficient: number
}

export interface DemoAssessment {
  id: string
  classroomId: string
  subjectCode: string
  term: number
  title: string
  date: string
  outOf: number
}

export interface DemoGrade {
  assessmentId: string
  studentId: string
  /** null : absent ou non saisi. */
  value: number | null
}

export type SkillLevel = 'A' | 'EA' | 'NA'

export interface DemoSkill {
  id: string
  domain: string
  label: string
}

export interface DemoSkillEvaluation {
  skillId: string
  studentId: string
  term: number
  level: SkillLevel | null
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface DemoAttendance {
  studentId: string
  date: string
  status: AttendanceStatus
  justified: boolean
}

export interface DemoRollCall {
  classroomId: string
  date: string
  takenBy: string
  takenAt: string
}

export interface DemoDaycareVisit {
  studentId: string
  date: string
  arrivedAt: string | null
  leftAt: string | null
  droppedBy: string | null
  pickedUpBy: string | null
}

export type DaycareLogKind = 'meal' | 'nap' | 'diaper' | 'mood' | 'activity' | 'health'

export interface DemoDaycareLog {
  id: string
  studentId: string
  date: string
  time: string
  kind: DaycareLogKind
  note: string
}

export interface DemoMessage {
  id: string
  from: 'school' | 'guardian'
  author: string
  body: string
  sentAt: string
}

export interface DemoConversation {
  id: string
  studentId: string
  guardianName: string
  subject: string
  unread: number
  messages: DemoMessage[]
}

export interface DemoAnnouncement {
  id: string
  title: string
  body: string
  /** Toute l'école, un cycle ou une classe (« class:<id> »). */
  audience: 'all' | CycleCode | `class:${string}`
  channels: ('app' | 'sms')[]
  sentAt: string
  author: string
  reach: number
}

export type EventKind = 'holiday' | 'exam' | 'meeting' | 'event' | 'training'

export interface DemoEvent {
  id: string
  title: string
  kind: EventKind
  start: string
  end: string
  cycle: CycleCode | null
  location: string | null
}

export interface DemoStaff {
  id: string
  name: string
  phone: string
  email: string | null
  roles: { role: 'director' | 'secretary' | 'accountant' | 'teacher'; cycle: CycleCode | null }[]
  lastLoginAt: string | null
}

export interface DemoActivity {
  id: string
  at: string
  kind: 'payment' | 'enrollment' | 'absence' | 'grade' | 'message'
  label: string
  studentId: string | null
}

export interface DemoSchool {
  key: string
  name: string
  address: string
  phone: string
  email: string
  motto: string
  year: string
  cycles: CycleCode[]
  levels: DemoLevel[]
  classrooms: DemoClassroom[]
  students: DemoStudent[]
  fees: DemoFee[]
  installments: DemoInstallment[]
  payments: DemoPayment[]
  subjects: DemoSubject[]
  assessments: DemoAssessment[]
  grades: DemoGrade[]
  skills: DemoSkill[]
  skillEvaluations: DemoSkillEvaluation[]
  attendance: DemoAttendance[]
  rollCalls: DemoRollCall[]
  daycareVisits: DemoDaycareVisit[]
  daycareLogs: DemoDaycareLog[]
  conversations: DemoConversation[]
  announcements: DemoAnnouncement[]
  events: DemoEvent[]
  staff: DemoStaff[]
  activity: DemoActivity[]
  /** Dernier numéro de reçu attribué (séquence par école et par année). */
  receiptSequence: number
}
