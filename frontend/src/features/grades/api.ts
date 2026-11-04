import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import type { SkillLevel } from '@/lib/demo/types'

import {
  addAssessment,
  classResults,
  gradeGrid,
  reportCard,
  reportStatus,
  saveGrade,
  setSkill,
  skillMatrix,
} from './demo'

export function useSubjects() {
  return useDemoQuery(['grades', 'subjects'], (school) => school.subjects)
}

export function useGradeGrid(classroomId: string, subjectCode: string, term: number) {
  return useDemoQuery(['grades', 'grid', classroomId, subjectCode, term], (school) =>
    gradeGrid(school, classroomId, subjectCode, term),
  )
}

export function useSaveGrade() {
  return useDemoMutation(
    (school, input: { assessmentId: string; studentId: string; value: number | null }) => {
      saveGrade(school, input.assessmentId, input.studentId, input.value)
    },
  )
}

export function useAddAssessment() {
  return useDemoMutation(
    (
      school,
      input: {
        classroomId: string
        subjectCode: string
        term: number
        title: string
        date: string
      },
    ) => addAssessment(school, input),
  )
}

export function useClassResults(classroomId: string, term: number) {
  return useDemoQuery(['grades', 'results', classroomId, term], (school) =>
    classResults(school, classroomId, term),
  )
}

export function useSkillMatrix(classroomId: string, term: number) {
  return useDemoQuery(['grades', 'skills', classroomId, term], (school) =>
    skillMatrix(school, classroomId, term),
  )
}

export function useSetSkill() {
  return useDemoMutation(
    (
      school,
      input: { studentId: string; skillId: string; term: number; level: SkillLevel | null },
    ) => {
      setSkill(school, input.studentId, input.skillId, input.term, input.level)
    },
  )
}

export function useReportStatus(
  classroomId: string,
  term: number,
  kind: 'report_card' | 'skills_booklet',
) {
  return useDemoQuery(['grades', 'reports', classroomId, term, kind], (school) =>
    reportStatus(school, classroomId, term, kind),
  )
}

export function useReportCard(
  studentId: string,
  term: number,
  kind: 'report_card' | 'skills_booklet',
) {
  return useDemoQuery(['grades', 'report', studentId, term, kind], (school) =>
    reportCard(school, studentId, term, kind),
  )
}
