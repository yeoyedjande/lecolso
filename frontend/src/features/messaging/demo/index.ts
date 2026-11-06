import { classroomOf } from '@/lib/demo/lookup'
import { demoId } from '@/lib/demo/store'
import type { DemoAnnouncement, DemoSchool } from '@/lib/demo/types'

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
