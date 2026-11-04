import { demoId } from '@/lib/demo/store'
import type { DemoEvent, DemoSchool } from '@/lib/demo/types'

export function eventsBetween(school: DemoSchool, from: string, to: string): DemoEvent[] {
  return school.events
    .filter((event) => event.end >= from && event.start <= to)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function addEvent(school: DemoSchool, input: Omit<DemoEvent, 'id'>): DemoEvent {
  if (input.end < input.start) throw new Error('La fin précède le début')
  const event: DemoEvent = { ...input, id: demoId('ev') }
  school.events.push(event)
  return event
}
