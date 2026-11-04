import { classroomOf, fullName, studentById } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type { DemoAnnouncement, DemoConversation, DemoSchool } from '@/lib/demo/types'

export interface ConversationSummary extends DemoConversation {
  studentName: string
  classroom: string
  lastAt: string
  preview: string
}

export function conversations(school: DemoSchool): ConversationSummary[] {
  return school.conversations
    .map((conversation) => {
      const student = studentById(school, conversation.studentId)
      const last = conversation.messages[conversation.messages.length - 1]
      return {
        ...conversation,
        messages: [...conversation.messages],
        studentName: student === undefined ? '' : fullName(student),
        classroom: student === undefined ? '' : classroomOf(school, student).name,
        lastAt: last?.sentAt ?? '',
        preview: last?.body ?? '',
      }
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

export function reply(
  school: DemoSchool,
  conversationId: string,
  body: string,
  author: string,
  now: Date,
): void {
  const conversation = school.conversations.find((c) => c.id === conversationId)
  if (conversation === undefined) throw new Error('Conversation introuvable')
  conversation.messages.push({
    id: demoId('msg'),
    from: 'school',
    author,
    body: body.trim(),
    sentAt: now.toISOString(),
  })
  conversation.unread = 0
}

export function markRead(school: DemoSchool, conversationId: string): void {
  const conversation = school.conversations.find((c) => c.id === conversationId)
  if (conversation !== undefined) conversation.unread = 0
}

export function announce(
  school: DemoSchool,
  input: Pick<DemoAnnouncement, 'title' | 'body' | 'audience' | 'channels' | 'author'>,
  now: Date,
): DemoAnnouncement {
  const reach = school.students.filter((student) => {
    if (input.audience === 'all') return true
    if (input.audience.startsWith('class:')) return student.classroomId === input.audience.slice(6)
    return classroomOf(school, student).cycle === input.audience
  }).length
  const announcement: DemoAnnouncement = {
    ...input,
    id: demoId('ann'),
    sentAt: now.toISOString(),
    reach,
  }
  school.announcements.unshift(announcement)
  return announcement
}
