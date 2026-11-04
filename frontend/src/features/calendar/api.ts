import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import type { DemoEvent } from '@/lib/demo/types'

import { addEvent, eventsBetween } from './demo'

export function useEvents(from: string, to: string) {
  return useDemoQuery(['calendar', from, to], (school) => eventsBetween(school, from, to))
}

export function useAddEvent() {
  return useDemoMutation((school, input: Omit<DemoEvent, 'id'>) => addEvent(school, input))
}
