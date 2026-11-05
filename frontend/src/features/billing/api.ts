import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'
import { fullName } from '@/lib/demo/lookup'

import { cashDesk, recordPayment, unpaid, type RecordPaymentInput } from './demo'

export type BillingGrid = components['schemas']['BillingGridResource']
export type FeeType = components['schemas']['FeeTypeResource']
export type Invoice = components['schemas']['InvoiceResource']
export type ScheduleRow = components['schemas']['ScheduleRowResource']
export type GridAmount = components['schemas']['SaveFeeGridRequest']['amounts'][number]
export type CalendarDate = components['schemas']['SaveCalendarRequest']['dates'][number]

function useBillingKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'billing'] as const }
}

/** Grille de frais de l'année en cours (vraie API) : montants par niveau, calendriers, inscriptions sans facture. */
export function useBillingGrid(enabled = true) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'grid'],
    enabled: enabled && school !== null,
    queryFn: async ({ signal }): Promise<BillingGrid> => {
      const { data, error } = await api.GET('/billing/grid', { signal })
      if (data === undefined) throw new Error('Grille indisponible', { cause: error })
      return data.data
    },
  })
}

/** Après une écriture sur la grille : grille, échéanciers et factures relus. */
function useInvalidateBilling() {
  const { key } = useBillingKey()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: key })
}

export function useSaveFeeGrid() {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: async (amounts: GridAmount[]): Promise<BillingGrid> => {
      const { data, response } = await api.PUT('/billing/grid', { body: { amounts } })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

export function useSaveCalendar() {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: async ({
      cycleId,
      dates,
    }: {
      cycleId: string
      dates: CalendarDate[]
    }): Promise<BillingGrid> => {
      const { data, response } = await api.PUT('/billing/calendars/{cycle}', {
        params: { path: { cycle: cycleId } },
        body: { dates },
      })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

/** Facture les élèves déjà inscrits qui n'ont pas de facture ; renvoie le nombre de factures créées. */
export function useGenerateInvoices() {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, response } = await api.POST('/billing/invoices/generate', { body: {} })
      if (data === undefined) throw new Error(`Facturation impossible (${String(response.status)})`)
      return data.created
    },
    onSuccess: invalidate,
  })
}

/** Échéancier de l'année en cours : montant attendu par date (vraie API). */
export function useBillingSchedules() {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'schedules'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<ScheduleRow[]> => {
      const { data, error } = await api.GET('/billing/schedules', { signal })
      if (data === undefined) throw new Error('Échéancier indisponible', { cause: error })
      return data.data
    },
  })
}

/** Factures d'un élève, la plus récente d'abord ; `null` si l'élève est hors du périmètre (404). */
export function useStudentInvoices(studentId: string, enabled = true) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'invoices', studentId],
    enabled: enabled && school !== null,
    queryFn: async ({ signal }): Promise<Invoice[] | null> => {
      const { data, error, response } = await api.GET('/students/{student}/invoices', {
        params: { path: { student: studentId } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Factures indisponibles', { cause: error })
      return data.data
    },
  })
}

export type InvoiceChange =
  | { kind: 'addOption'; feeTypeId: string }
  | { kind: 'removeOption'; feeTypeId: string }
  | { kind: 'addLine'; label: string; amount: number; dueOn: string | null }
  | { kind: 'addDiscount'; amount: number; reason: string }
  | { kind: 'removeLine'; lineId: string }

/** Modification d'une facture (service, ligne manuelle, remise) ; la facture renvoyée remplace l'ancienne. */
export function useChangeInvoice(studentId: string) {
  const { key } = useBillingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      invoiceId,
      change,
    }: {
      invoiceId: string
      change: InvoiceChange
    }): Promise<Invoice> => {
      const path = { invoice: invoiceId }
      const { data, response } =
        change.kind === 'addOption'
          ? await api.POST('/invoices/{invoice}/options', {
              params: { path },
              body: { fee_type_id: change.feeTypeId },
            })
          : change.kind === 'removeOption'
            ? await api.DELETE('/invoices/{invoice}/options/{feeType}', {
                params: { path: { ...path, feeType: change.feeTypeId } },
              })
            : change.kind === 'addLine'
              ? await api.POST('/invoices/{invoice}/lines', {
                  params: { path },
                  body: {
                    label: change.label,
                    amount: change.amount,
                    ...(change.dueOn === null ? {} : { due_on: change.dueOn }),
                  },
                })
              : change.kind === 'addDiscount'
                ? await api.POST('/invoices/{invoice}/discounts', {
                    params: { path },
                    body: { amount: change.amount, reason: change.reason },
                  })
                : await api.DELETE('/invoices/{invoice}/lines/{line}', {
                    params: { path: { ...path, line: change.lineId } },
                  })
      if (data === undefined)
        throw new Error(`Modification impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...key, 'invoices', studentId] })
      await queryClient.invalidateQueries({ queryKey: [...key, 'schedules'] })
    },
  })
}

// --- Démonstration : impayés, caisse, encaissement et reçu (lots 5b et 5c) ---

export function useUnpaid() {
  return useDemoQuery(['billing', 'unpaid'], (school, today) => unpaid(school, today))
}

export function useCashDesk(date?: string) {
  return useDemoQuery(['billing', 'cash', date ?? 'today'], (school, today) =>
    cashDesk(school, date ?? today),
  )
}

export function useRecordPayment() {
  return useDemoMutation((school, input: RecordPaymentInput) =>
    recordPayment(school, input, new Date()),
  )
}

/** Reçu imprimable : paiement, élève, payeur, école. */
export function useReceipt(paymentId: string) {
  return useDemoQuery(['billing', 'receipt', paymentId], (school) => {
    const payment = school.payments.find((p) => p.id === paymentId)
    if (payment === undefined) return null
    const student = school.students.find((s) => s.id === payment.studentId)
    const classroom = school.classrooms.find((c) => c.id === student?.classroomId)
    const paid = school.payments
      .filter((p) => p.studentId === payment.studentId && p.paidAt <= payment.paidAt)
      .reduce((sum, p) => sum + p.amount, 0)
    const expected = school.installments
      .filter((i) => i.studentId === payment.studentId)
      .reduce((sum, i) => sum + i.amount, 0)
    return {
      payment,
      studentName: student === undefined ? '' : fullName(student),
      matricule: student?.matricule ?? '',
      classroom: classroom?.name ?? '',
      payer: (student?.guardians.find((g) => g.isPayer) ?? student?.guardians[0])?.name ?? '',
      remaining: Math.max(0, expected - paid),
      school: {
        name: school.name,
        address: school.address,
        phone: school.phone,
        year: school.year,
      },
    }
  })
}

/** Relance des impayés (simulée : SMS au payeur). */
export function useRemind() {
  return useDemoMutation((_school, studentIds: string[]) => studentIds.length)
}

export type { RecordPaymentInput }
