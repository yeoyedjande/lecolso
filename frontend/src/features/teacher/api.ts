import { useAttendanceClassrooms, type AttendanceClassroom } from '@/features/attendance/api'
import { useGradingClassrooms, type GradingClassroom } from '@/features/grades/api'

/** Classe de l'enseignant (titulaire) : mode de présence et mode d'évaluation, d'après les paramètres du cycle. */
export interface TeacherClass {
  id: string
  name: string
  cycle: AttendanceClassroom['cycle']
  attendanceMode: AttendanceClassroom['mode']
  canTake: boolean
  grading: GradingClassroom | null
}

/**
 * Classes dont l'utilisateur est titulaire, cette année : l'API ne renvoie à un enseignant que ses classes
 * (`is_homeroom`), avec ses droits ; le mode de notation vient de `grading/classrooms`.
 */
export function useTeacherClasses(): {
  data: TeacherClass[] | undefined
  isPending: boolean
  isError: boolean
} {
  const attendance = useAttendanceClassrooms()
  const grading = useGradingClassrooms()
  const data =
    attendance.data === undefined || grading.data === undefined
      ? undefined
      : attendance.data
          .filter((classroom) => classroom.is_homeroom)
          .map((classroom) => ({
            id: classroom.id,
            name: classroom.name,
            cycle: classroom.cycle,
            attendanceMode: classroom.mode,
            canTake: classroom.can_take,
            grading: grading.data.find((candidate) => candidate.id === classroom.id) ?? null,
          }))
  return {
    data,
    isPending: attendance.isPending || grading.isPending,
    isError: attendance.isError || grading.isError,
  }
}
