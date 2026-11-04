import { classroomOf, fullName, studentsOf } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type { DemoClassroom, DemoConversation, DemoSchool } from '@/lib/demo/types'

/** Espace enseignant : uniquement les classes dont l'enseignant connecté est titulaire (rapprochement par téléphone). */
export interface TeacherClass extends DemoClassroom {
  students: number
  rollCallDone: boolean
  absentToday: number
}

export function myClasses(school: DemoSchool, phone: string, today: string): TeacherClass[] {
  return school.classrooms
    .filter((classroom) => classroom.teacherPhone === phone)
    .map((classroom) => {
      const ids = new Set(studentsOf(school, classroom.id).map((student) => student.id))
      return {
        ...classroom,
        students: ids.size,
        rollCallDone: school.rollCalls.some(
          (call) => call.classroomId === classroom.id && call.date === today,
        ),
        absentToday: school.attendance.filter(
          (a) => a.date === today && ids.has(a.studentId) && a.status !== 'late',
        ).length,
      }
    })
}

export function teacherConversations(
  school: DemoSchool,
  phone: string,
): (DemoConversation & { childName: string; classroom: string; lastAt: string })[] {
  const classIds = new Set(
    school.classrooms.filter((c) => c.teacherPhone === phone).map((c) => c.id),
  )
  return school.conversations
    .flatMap((conversation) => {
      const student = school.students.find((candidate) => candidate.id === conversation.studentId)
      if (student === undefined || !classIds.has(student.classroomId)) return []
      return [
        {
          ...conversation,
          messages: [...conversation.messages],
          childName: fullName(student),
          classroom: classroomOf(school, student).name,
          lastAt: conversation.messages[conversation.messages.length - 1]?.sentAt ?? '',
        },
      ]
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/** Message d'un enseignant au parent payeur d'un élève de ses classes (nouvelle conversation ou suite). */
export function messageParent(
  school: DemoSchool,
  input: { phone: string; studentId: string; subject: string; body: string; author: string },
  now: Date,
): DemoConversation {
  const student = school.students.find((candidate) => candidate.id === input.studentId)
  const classroom = student === undefined ? undefined : classroomOf(school, student)
  if (student === undefined || classroom?.teacherPhone !== input.phone)
    throw new Error('Élève introuvable')
  const guardian = student.guardians.find((g) => g.isPayer) ?? student.guardians[0]
  if (guardian === undefined) throw new Error('Aucun parent')
  const message = {
    id: demoId('msg'),
    from: 'school' as const,
    author: input.author,
    body: input.body.trim(),
    sentAt: now.toISOString(),
  }
  const conversation: DemoConversation = {
    id: demoId('conv'),
    studentId: student.id,
    guardianName: guardian.name,
    guardianPhone: guardian.phone,
    subject: input.subject.trim(),
    unread: 0,
    messages: [message],
  }
  school.conversations.unshift(conversation)
  return conversation
}
