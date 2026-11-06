import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type ChildSummary = components['schemas']['ChildSummaryResource']
export type Child = components['schemas']['ChildResource']
export type ChildMark = components['schemas']['ChildMarkResource']

function useParentKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'parent'] as const }
}

/** Enfants du parent connecté : classe, présence du jour, reste à payer, absences à justifier. */
export function useMyChildren() {
  const { school, key } = useParentKey()
  return useQuery({
    queryKey: [...key, 'children'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<ChildSummary[]> => {
      const { data, error } = await api.GET('/guardian/children', { signal })
      if (data === undefined) throw new Error('Enfants indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Fiche d'un enfant (notes de la période `termId`, celle du jour si `null`) ; `null` si ce n'est pas son enfant. */
export function useChild(studentId: string, termId: string | null = null) {
  const { school, key } = useParentKey()
  return useQuery({
    queryKey: [...key, 'child', studentId, termId],
    enabled: school !== null && studentId !== '',
    queryFn: async ({ signal }): Promise<Child | null> => {
      const { data, error, response } = await api.GET('/guardian/children/{student}', {
        params: { path: { student: studentId }, query: { term_id: termId } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Fiche indisponible', { cause: error })
      return data.data
    },
  })
}

/** Justification d'une absence par le parent (motif, photo facultative) : à valider par l'école. */
export function useJustifyAbsence() {
  const { key } = useParentKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      markId,
      reason,
      proof,
    }: {
      markId: string
      reason: string
      proof: File | null
    }): Promise<void> => {
      const form = new FormData()
      form.append('reason', reason)
      if (proof !== null) form.append('proof', proof)
      // Corps réel : le formulaire multipart ci-dessus (motif et photo du certificat)
      const { data, response } = await api.POST('/attendance/marks/{mark}/justification', {
        params: { path: { mark: markId } },
        body: { reason },
        bodySerializer: () => form,
      })
      if (data === undefined)
        throw new Error(`Justification impossible (${String(response.status)})`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
