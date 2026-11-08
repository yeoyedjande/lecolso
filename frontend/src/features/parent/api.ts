import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type ChildSummary = components['schemas']['ChildSummaryResource']
export type Child = components['schemas']['ChildResource']
export type ChildMark = components['schemas']['ChildMarkResource']
export type ChildPlannedAbsence = components['schemas']['ChildPlannedAbsenceResource']

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

/**
 * Prévenir d'une absence à venir (du … au …, motif) : l'administration reçoit un message et décide ; l'appel de ces
 * jours marque l'enfant absent avec cette justification.
 */
export function usePlanAbsence() {
  const { key, school } = useParentKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      studentId: string
      startsOn: string
      endsOn: string
      reason: string
      message: string | null
    }): Promise<ChildPlannedAbsence> => {
      const { data, response } = await api.POST('/guardian/children/{student}/planned-absences', {
        params: { path: { student: input.studentId } },
        body: {
          starts_on: input.startsOn,
          ends_on: input.endsOn,
          reason: input.reason,
          message: input.message,
        },
      })
      if (data === undefined) throw new Error(`Envoi impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
      await queryClient.invalidateQueries({ queryKey: ['school', school?.id ?? null, 'messaging'] })
    },
  })
}

export type PaymentIntent = components['schemas']['PaymentIntentResource']
export type MobileMoneyMethod = 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave'
export const MOBILE_MONEY_METHODS: MobileMoneyMethod[] = [
  'orange_money',
  'mtn_momo',
  'moov_money',
  'wave',
]

/** Frais Mobile Money (même calcul que l'API : points de base, arrondi à l'entier supérieur). */
export function mobileMoneyCharge(
  amount: number,
  fees: { fee_payer: string; fee_rate_bps: number },
): { fee: number; charged: number } {
  const fee = Math.ceil((amount * fees.fee_rate_bps) / 10000)
  return { fee, charged: fees.fee_payer === 'guardian' ? amount + fee : amount }
}

/** Lancer un paiement Mobile Money pour un enfant (le parent valide ensuite sur son téléphone). */
export function usePayForChild() {
  return useMutation({
    mutationFn: async (input: {
      studentId: string
      amount: number
      method: MobileMoneyMethod
      phone: string
    }): Promise<PaymentIntent> => {
      const { data, response } = await api.POST('/guardian/children/{student}/payments', {
        params: { path: { student: input.studentId } },
        body: { amount: input.amount, method: input.method, phone: input.phone },
      })
      if (data === undefined) throw new Error(`Paiement impossible (${String(response.status)})`)
      return data.data
    },
  })
}

/** Suivi d'un paiement Mobile Money : relu toutes les 3 s tant qu'il est en attente ; enfants relus une fois payé. */
export function usePaymentIntent(id: string | null) {
  const { school, key } = useParentKey()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: [...key, 'payment-intent', id],
    enabled: school !== null && id !== null,
    queryFn: async ({ signal }): Promise<PaymentIntent> => {
      const { data, error } = await api.GET('/guardian/payment-intents/{paymentIntent}', {
        params: { path: { paymentIntent: id ?? '' } },
        signal,
      })
      if (data === undefined) throw new Error('Paiement introuvable', { cause: error })
      if (data.data.status === 'succeeded') {
        await queryClient.invalidateQueries({ queryKey: [...key, 'children'] })
        await queryClient.invalidateQueries({ queryKey: [...key, 'child'] })
      }
      return data.data
    },
    // Après queryFn : le type des données en est déduit
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
  })
}
