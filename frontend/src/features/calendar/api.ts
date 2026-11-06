import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type SchoolEvent = components['schemas']['SchoolEventResource']
export type SchoolEventKind = SchoolEvent['kind']
export interface SchoolEventInput {
  title: string
  kind: SchoolEventKind
  startsOn: string
  endsOn: string
  cycleId: string | null
  location: string | null
}

function useCalendarKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'calendar'] as const }
}

/** Événements qui recoupent `from` → `to` (toute l'école et les cycles de l'utilisateur). */
export function useEvents(from: string, to: string) {
  const { school, key } = useCalendarKey()
  return useQuery({
    queryKey: [...key, from, to],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<SchoolEvent[]> => {
      const { data, error } = await api.GET('/calendar/events', {
        params: { query: { from, to } },
        signal,
      })
      if (data === undefined) throw new Error('Calendrier indisponible', { cause: error })
      return data.data
    },
  })
}

function body(input: SchoolEventInput) {
  return {
    title: input.title,
    kind: input.kind,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    cycle_id: input.cycleId,
    location: input.location,
  }
}

/** Ajouter (`id` nul) ou modifier un événement (direction : school.settings.manage). */
export function useSaveEvent() {
  const { key } = useCalendarKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: SchoolEventInput & { id: string | null }): Promise<SchoolEvent> => {
      const { data, response } =
        id === null
          ? await api.POST('/calendar/events', { body: body(input) })
          : await api.PATCH('/calendar/events/{event}', {
              params: { path: { event: id } },
              body: body(input),
            })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Supprimer un événement. */
export function useDeleteEvent() {
  const { key } = useCalendarKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { response } = await api.DELETE('/calendar/events/{event}', {
        params: { path: { event: id } },
      })
      if (!response.ok) throw new Error(`Suppression impossible (${String(response.status)})`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
