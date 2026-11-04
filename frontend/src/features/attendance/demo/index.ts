import { addDays, at, schoolDays } from '@/lib/demo/dates'
import { HOLIDAYS } from '@/lib/demo/dataset'
import { classroomOf, fullName, studentById, studentsOf } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type {
  AttendanceStatus,
  DaycareLogKind,
  DemoDaycareLog,
  DemoDaycareVisit,
  DemoSchool,
  DemoStudent,
} from '@/lib/demo/types'

export interface RollCall {
  classroomId: string
  date: string
  taken: { by: string; at: string } | null
  rows: { student: DemoStudent; name: string; status: AttendanceStatus; justified: boolean }[]
}

export function rollCall(school: DemoSchool, classroomId: string, date: string): RollCall {
  const record = school.rollCalls.find(
    (call) => call.classroomId === classroomId && call.date === date,
  )
  return {
    classroomId,
    date,
    taken: record === undefined ? null : { by: record.takenBy, at: record.takenAt },
    rows: studentsOf(school, classroomId).map((student) => {
      const entry = school.attendance.find((a) => a.studentId === student.id && a.date === date)
      return {
        student,
        name: fullName(student),
        status: entry?.status ?? 'present',
        justified: entry?.justified ?? false,
      }
    }),
  }
}

export interface RollCallInput {
  classroomId: string
  date: string
  entries: { studentId: string; status: AttendanceStatus }[]
  takenBy: string
}

/** Enregistre (ou corrige) l'appel d'une classe pour un jour : seules les absences et retards sont stockés. */
export function saveRollCall(school: DemoSchool, input: RollCallInput, now: Date): void {
  const ids = new Set(input.entries.map((entry) => entry.studentId))
  school.attendance = school.attendance.filter(
    (a) => !(a.date === input.date && ids.has(a.studentId)),
  )
  for (const entry of input.entries) {
    if (entry.status === 'present') continue
    school.attendance.push({
      studentId: entry.studentId,
      date: input.date,
      status: entry.status,
      justified: entry.status === 'excused',
    })
    if (entry.status === 'absent') {
      school.activity.unshift({
        id: demoId('act'),
        at: now.toISOString(),
        kind: 'absence',
        label: '',
        studentId: entry.studentId,
      })
    }
  }
  school.rollCalls = school.rollCalls.filter(
    (c) => !(c.classroomId === input.classroomId && c.date === input.date),
  )
  school.rollCalls.push({
    classroomId: input.classroomId,
    date: input.date,
    takenBy: input.takenBy,
    takenAt: now.toISOString(),
  })
}

export interface AttendanceDay {
  date: string
  taken: boolean
  present: number
  absent: number
  late: number
}

/** Historique d'une classe sur une période (jours de classe uniquement). */
export function history(
  school: DemoSchool,
  classroomId: string,
  from: string,
  to: string,
): AttendanceDay[] {
  const students = new Set(studentsOf(school, classroomId).map((student) => student.id))
  return schoolDays(from, to, HOLIDAYS).map((date) => {
    const taken = school.rollCalls.some(
      (call) => call.classroomId === classroomId && call.date === date,
    )
    const entries = school.attendance.filter((a) => a.date === date && students.has(a.studentId))
    const absent = entries.filter((a) => a.status === 'absent' || a.status === 'excused').length
    const late = entries.filter((a) => a.status === 'late').length
    return { date, taken, absent, late, present: taken ? students.size - absent : 0 }
  })
}

export interface AbsenceRow {
  student: DemoStudent
  name: string
  classroom: string
  date: string
  status: AttendanceStatus
  justified: boolean
}

export function absencesOn(school: DemoSchool, date: string): AbsenceRow[] {
  return school.attendance
    .filter((a) => a.date === date && a.status !== 'present')
    .flatMap((a) => {
      const student = studentById(school, a.studentId)
      if (student === undefined) return []
      return [
        {
          student,
          name: fullName(student),
          classroom: classroomOf(school, student).name,
          date,
          status: a.status,
          justified: a.justified,
        },
      ]
    })
}

/** Taux de présence des N derniers jours de classe, toutes classes confondues. */
export function attendanceRate(
  school: DemoSchool,
  today: string,
  days: number,
): { date: string; rate: number }[] {
  const dates = schoolDays(addDays(today, -days * 2), today, HOLIDAYS).slice(-days)
  return dates.map((date) => {
    const called = school.rollCalls
      .filter((call) => call.date === date)
      .map((call) => call.classroomId)
    const total = school.students.filter((student) => called.includes(student.classroomId)).length
    const absent = school.attendance.filter(
      (a) => a.date === date && (a.status === 'absent' || a.status === 'excused'),
    ).length
    return { date, rate: total === 0 ? 0 : Math.round(((total - absent) / total) * 1000) / 10 }
  })
}

export interface DaycareBoard {
  date: string
  children: {
    student: DemoStudent
    name: string
    classroom: string
    visit: DemoDaycareVisit | null
    logs: DemoDaycareLog[]
  }[]
}

/** Enfants des classes suivies en arrivées/départs (choisies d'après le paramètre attendance_mode du cycle). */
export function daycareBoard(
  school: DemoSchool,
  date: string,
  classroomIds: readonly string[],
): DaycareBoard {
  const toddlers = school.students.filter((student) => classroomIds.includes(student.classroomId))
  return {
    date,
    children: toddlers
      .map((student) => ({
        student,
        name: fullName(student),
        classroom: classroomOf(school, student).name,
        visit:
          school.daycareVisits.find((v) => v.studentId === student.id && v.date === date) ?? null,
        logs: school.daycareLogs
          .filter((l) => l.studentId === student.id && l.date === date)
          .sort((a, b) => a.time.localeCompare(b.time)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  }
}

export function checkIn(
  school: DemoSchool,
  studentId: string,
  date: string,
  time: string,
  by: string,
): void {
  const visit = school.daycareVisits.find((v) => v.studentId === studentId && v.date === date)
  if (visit === undefined) {
    school.daycareVisits.push({
      studentId,
      date,
      arrivedAt: at(date, time),
      leftAt: null,
      droppedBy: by,
      pickedUpBy: null,
    })
  } else {
    visit.arrivedAt = at(date, time)
    visit.droppedBy = by
  }
}

export function checkOut(
  school: DemoSchool,
  studentId: string,
  date: string,
  time: string,
  by: string,
): void {
  const visit = school.daycareVisits.find((v) => v.studentId === studentId && v.date === date)
  if (visit?.arrivedAt == null) throw new Error('Arrivée non enregistrée')
  visit.leftAt = at(date, time)
  visit.pickedUpBy = by
}

export function addDaycareLog(
  school: DemoSchool,
  input: { studentId: string; date: string; time: string; kind: DaycareLogKind; note: string },
): DemoDaycareLog {
  const log: DemoDaycareLog = { ...input, id: demoId('log') }
  school.daycareLogs.push(log)
  return log
}
