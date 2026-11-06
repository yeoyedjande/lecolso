/** Annonces : démonstration jusqu'au lot 9b. */
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import type { DemoAnnouncement } from '@/lib/demo/types'

import { announce } from './demo'

export function useAnnouncements() {
  return useDemoQuery(['messaging', 'announcements'], (school) => [...school.announcements])
}

export function useAnnounce() {
  return useDemoMutation(
    (
      school,
      input: Pick<DemoAnnouncement, 'title' | 'body' | 'audience' | 'channels' | 'author'>,
    ) => announce(school, input, new Date()),
  )
}
