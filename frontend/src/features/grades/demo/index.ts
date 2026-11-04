import { fullName, studentsOf } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type { DemoAssessment, DemoSchool, DemoStudent, SkillLevel } from '@/lib/demo/types'

/** Moyenne sur 20 d'une liste de notes (absences ignorées), arrondie au centième ; null sans note. */
export function average(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null)
  if (present.length === 0) return null
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 100) / 100
}

/** Moyenne pondérée par les coefficients (matières sans note ignorées). */
export function weightedAverage(entries: readonly { value: number | null; coefficient: number }[]): number | null {
  const present = entries.filter((entry): entry is { value: number; coefficient: number } => entry.value !== null)
  const weights = present.reduce((sum, entry) => sum + entry.coefficient, 0)
  if (weights === 0) return null
  return Math.round((present.reduce((sum, entry) => sum + entry.value * entry.coefficient, 0) / weights) * 100) / 100
}

/** Rangs avec ex æquo (1, 2, 2, 4) ; les élèves sans moyenne ne sont pas classés. */
export function ranks(averages: ReadonlyMap<string, number | null>): Map<string, { rank: number; tied: boolean }> {
  const sorted = [...averages].filter((entry): entry is [string, number] => entry[1] !== null).sort((a, b) => b[1] - a[1])
  const result = new Map<string, { rank: number; tied: boolean }>()
  sorted.forEach(([id, value], index) => {
    const first = sorted.findIndex(([, other]) => other === value)
    const count = sorted.filter(([, other]) => other === value).length
    result.set(id, { rank: (first === -1 ? index : first) + 1, tied: count > 1 })
  })
  return result
}

export interface GradeGrid {
  assessments: DemoAssessment[]
  rows: { student: DemoStudent; name: string; values: Record<string, number | null>; average: number | null }[]
}

export function gradeGrid(school: DemoSchool, classroomId: string, subjectCode: string, term: number): GradeGrid {
  const assessments = school.assessments
    .filter((a) => a.classroomId === classroomId && a.subjectCode === subjectCode && a.term === term)
    .sort((a, b) => a.date.localeCompare(b.date))
  const rows = studentsOf(school, classroomId).map((student) => {
    const values: Record<string, number | null> = {}
    for (const assessment of assessments) {
      const grade = school.grades.find((g) => g.assessmentId === assessment.id && g.studentId === student.id)
      values[assessment.id] = grade?.value ?? null
    }
    return { student, name: fullName(student), values, average: average(Object.values(values)) }
  })
  return { assessments, rows }
}

export function saveGrade(school: DemoSchool, assessmentId: string, studentId: string, value: number | null): void {
  const assessment = school.assessments.find((a) => a.id === assessmentId)
  if (assessment === undefined) throw new Error('Évaluation introuvable')
  if (value !== null && (value < 0 || value > assessment.outOf || Math.round(value * 4) !== value * 4)) {
    throw new Error('Note invalide')
  }
  const grade = school.grades.find((g) => g.assessmentId === assessmentId && g.studentId === studentId)
  if (grade === undefined) school.grades.push({ assessmentId, studentId, value })
  else grade.value = value
}

export function addAssessment(school: DemoSchool, input: Omit<DemoAssessment, 'id' | 'outOf'>): DemoAssessment {
  const assessment: DemoAssessment = { ...input, id: demoId('eval'), outOf: 20 }
  school.assessments.push(assessment)
  return assessment
}

export interface ClassResults {
  subjects: { code: string; name: string; coefficient: number }[]
  rows: {
    student: DemoStudent
    name: string
    bySubject: Record<string, number | null>
    average: number | null
    rank: { rank: number; tied: boolean } | null
  }[]
  classAverage: number | null
}

/** Moyennes par matière, moyenne générale pondérée et rang de chaque élève d'une classe. */
export function classResults(school: DemoSchool, classroomId: string, term: number): ClassResults {
  const students = studentsOf(school, classroomId)
  const rows = students.map((student) => {
    const bySubject: Record<string, number | null> = {}
    for (const subject of school.subjects) {
      const grid = school.assessments.filter((a) => a.classroomId === classroomId && a.subjectCode === subject.code && a.term === term)
      bySubject[subject.code] = average(
        grid.map((assessment) => school.grades.find((g) => g.assessmentId === assessment.id && g.studentId === student.id)?.value ?? null),
      )
    }
    const overall = weightedAverage(school.subjects.map((subject) => ({ value: bySubject[subject.code] ?? null, coefficient: subject.coefficient })))
    return { student, name: fullName(student), bySubject, average: overall }
  })
  const ranking = ranks(new Map(rows.map((row) => [row.student.id, row.average])))
  return {
    subjects: school.subjects,
    rows: rows.map((row) => ({ ...row, rank: ranking.get(row.student.id) ?? null })),
    classAverage: average(rows.map((row) => row.average)),
  }
}

export interface SkillMatrix {
  domains: { name: string; skills: { id: string; label: string }[] }[]
  rows: { student: DemoStudent; name: string; levels: Record<string, SkillLevel | null> }[]
}

export function skillMatrix(school: DemoSchool, classroomId: string, term: number): SkillMatrix {
  const domains = new Map<string, { id: string; label: string }[]>()
  for (const skill of school.skills) {
    domains.set(skill.domain, [...(domains.get(skill.domain) ?? []), { id: skill.id, label: skill.label }])
  }
  return {
    domains: [...domains].map(([name, skills]) => ({ name, skills })),
    rows: studentsOf(school, classroomId).map((student) => {
      const levels: Record<string, SkillLevel | null> = {}
      for (const skill of school.skills) {
        levels[skill.id] =
          school.skillEvaluations.find((e) => e.skillId === skill.id && e.studentId === student.id && e.term === term)?.level ?? null
      }
      return { student, name: fullName(student), levels }
    }),
  }
}

export function setSkill(school: DemoSchool, studentId: string, skillId: string, term: number, level: SkillLevel | null): void {
  const entry = school.skillEvaluations.find((e) => e.skillId === skillId && e.studentId === studentId && e.term === term)
  if (entry === undefined) school.skillEvaluations.push({ skillId, studentId, term, level })
  else entry.level = level
}

/** Appréciation automatique d'après la moyenne (modifiable sur le bulletin définitif). */
export function appreciation(value: number | null): string {
  if (value === null) return 'Non évalué'
  if (value >= 16) return 'Excellent travail, félicitations'
  if (value >= 14) return 'Très bon travail'
  if (value >= 12) return 'Bon travail, continue ainsi'
  if (value >= 10) return 'Travail passable, peut mieux faire'
  return 'Résultats insuffisants, des efforts sont attendus'
}
