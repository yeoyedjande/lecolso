import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type BillingGrid = components['schemas']['BillingGridResource']
export type FeeType = components['schemas']['FeeTypeResource']
export type Invoice = components['schemas']['InvoiceResource']
export type ScheduleRow = components['schemas']['ScheduleRowResource']
export type GridAmount = components['schemas']['SaveFeeGridRequest']['amounts'][number]
export type CalendarDate = components['schemas']['SaveCalendarRequest']['dates'][number]
export type Payment = components['schemas']['PaymentResource']
export type PaymentMethod = Payment['method']
export type Receipt = components['schemas']['ReceiptResource']
export type CashDesk = components['schemas']['CashDeskResource']
export type CashSession = components['schemas']['CashSessionResource']
export type FinancialPolicy = components['schemas']['FinancialPolicyResource']
export type UnpaidRow = components['schemas']['UnpaidRowResource']
export type ReminderOutcome = components['schemas']['ReminderOutcomeResource']

/** Moyens de paiement au guichet, dans l'ordre d'affichage. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'cash',
  'orange_money',
  'mtn_momo',
  'moov_money',
  'wave',
  'cheque',
  'transfer',
]

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
  | {
      kind: 'refund'
      amount: number
      method: PaymentMethod
      reference: string | null
      reason: string
    }
  | { kind: 'transfer'; toInvoiceId: string; amount: number; reason: string }

/** Modification d'une facture (service, ligne manuelle, remise) ; la facture renvoyée remplace l'ancienne. */
export function useChangeInvoice() {
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
                : change.kind === 'refund'
                  ? await api.POST('/invoices/{invoice}/refunds', {
                      params: { path },
                      body: {
                        amount: change.amount,
                        method: change.method,
                        reference: change.reference,
                        reason: change.reason,
                      },
                    })
                  : change.kind === 'transfer'
                    ? await api.POST('/invoices/{invoice}/credit-transfers', {
                        params: { path },
                        body: {
                          to_invoice_id: change.toInvoiceId,
                          amount: change.amount,
                          reason: change.reason,
                        },
                      })
                    : await api.DELETE('/invoices/{invoice}/lines/{line}', {
                        params: { path: { ...path, line: change.lineId } },
                      })
      if (data === undefined)
        throw new Error(`Modification impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      // Un report touche aussi la facture d'un frère ou d'une sœur ; un remboursement, la caisse du jour
      await queryClient.invalidateQueries({ queryKey: [...key, 'invoices'] })
      await queryClient.invalidateQueries({ queryKey: [...key, 'schedules'] })
      await queryClient.invalidateQueries({ queryKey: [...key, 'cash'] })
    },
  })
}

// --- Encaissements, reçus et caisse du jour (vraie API) ---

/** Après un mouvement d'argent : factures, caisse du jour et reçus relus. */
function useInvalidateMoney() {
  const { key } = useBillingKey()
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...key, 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: [...key, 'cash'] }),
      queryClient.invalidateQueries({ queryKey: [...key, 'receipt'] }),
    ])
  }
}

export interface RecordPaymentInput {
  invoiceId: string
  amount: number
  method: PaymentMethod
  reference: string | null
}

/** Encaissement au guichet, dans la caisse du jour de l'utilisateur ; renvoie le reçu numéroté. */
export function useRecordPayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: async (input: RecordPaymentInput): Promise<Receipt> => {
      const { data, response } = await api.POST('/invoices/{invoice}/payments', {
        params: { path: { invoice: input.invoiceId } },
        body: { amount: input.amount, method: input.method, reference: input.reference },
      })
      if (data === undefined)
        throw new Error(`Encaissement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

/** Reçu imprimable d'un paiement ; `null` s'il est introuvable (autre école, hors du périmètre). */
export function useReceipt(paymentId: string) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'receipt', paymentId],
    enabled: school !== null,
    // Le logo de l'école est une URL signée de 30 minutes : relue après 10 minutes
    staleTime: 10 * 60_000,
    queryFn: async ({ signal }): Promise<Receipt | null> => {
      const { data, error, response } = await api.GET('/payments/{payment}', {
        params: { path: { payment: paymentId } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Reçu indisponible', { cause: error })
      return data.data
    },
  })
}

export type ReceiptPdf = components['schemas']['ReceiptPdfResource']

/** Relecture du reçu PDF pendant son rendu, puis avant l'expiration de son URL signée (10 minutes). */
export const RECEIPT_PDF_POLL_MS = 2_000
export const RECEIPT_PDF_REFRESH_MS = 8 * 60_000

/**
 * Reçu PDF d'un paiement (version « ANNULÉ » après une annulation), rendu en arrière-plan par l'API : relu toutes
 * les 2 s tant qu'il est en préparation ; URL signée relue avant ses 10 minutes de validité.
 */
export function useReceiptPdf(paymentId: string) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'receipt', paymentId, 'pdf'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<ReceiptPdf | null> => {
      const { data, error, response } = await api.GET('/payments/{payment}/receipt-pdf', {
        params: { path: { payment: paymentId } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Reçu PDF indisponible', { cause: error })
      return data.data
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'pending') return RECEIPT_PDF_POLL_MS
      return status === 'ready' ? RECEIPT_PDF_REFRESH_MS : false
    },
  })
}

/** Nouveau rendu d'un reçu PDF en échec. */
export function useRetryReceiptPdf(paymentId: string) {
  const queryClient = useQueryClient()
  const { key } = useBillingKey()
  return useMutation({
    mutationFn: async (): Promise<ReceiptPdf> => {
      const { data, response } = await api.POST('/payments/{payment}/receipt-pdf', {
        params: { path: { payment: paymentId } },
      })
      if (data === undefined) throw new Error(`Reçu PDF indisponible (${String(response.status)})`)
      return data.data
    },
    onSuccess: (pdf) => {
      queryClient.setQueryData([...key, 'receipt', paymentId, 'pdf'], pdf)
    },
  })
}

/** Annulation d'un paiement par la direction (motif obligatoire) ; le reçu reste, marqué annulé. */
export function useCancelPayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: async ({
      paymentId,
      reason,
    }: {
      paymentId: string
      reason: string
    }): Promise<Receipt> => {
      const { data, response } = await api.POST('/payments/{payment}/cancel', {
        params: { path: { payment: paymentId } },
        body: { reason },
      })
      if (data === undefined) throw new Error(`Annulation impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

/** Caisse d'un jour (AAAA-MM-JJ, aujourd'hui par défaut) : sa caisse, ou toutes celles de l'école. */
export function useCashDesk(date: string | null = null) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'cash', date ?? 'today'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<CashDesk> => {
      const { data, error } = await api.GET('/billing/cash-desk', {
        params: { query: { date } },
        signal,
      })
      if (data === undefined) throw new Error('Caisse indisponible', { cause: error })
      return data.data
    },
  })
}

/** Clôture de sa caisse : espèces comptées, note obligatoire en cas d'écart. */
export function useCloseCashSession() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: async ({
      sessionId,
      countedCash,
      note,
    }: {
      sessionId: string
      countedCash: number
      note: string | null
    }): Promise<CashSession> => {
      const { data, response } = await api.POST('/billing/cash-sessions/{cashSession}/close', {
        params: { path: { cashSession: sessionId } },
        body: { counted_cash: countedCash, note },
      })
      if (data === undefined) throw new Error(`Clôture impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: invalidate,
  })
}

/** Politique financière de l'école (départ d'un élève). */
export function useFinancialPolicy(enabled = true) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'policy'],
    enabled: enabled && school !== null,
    queryFn: async ({ signal }): Promise<FinancialPolicy> => {
      const { data, error } = await api.GET('/billing/policy', { signal })
      if (data === undefined) throw new Error('Politique indisponible', { cause: error })
      return data.data
    },
  })
}

export function useSaveFinancialPolicy() {
  const { key } = useBillingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      change:
        | { departure: FinancialPolicy['departure'] }
        | { mobile_money: FinancialPolicy['mobile_money'] },
    ): Promise<FinancialPolicy> => {
      const { data, response } = await api.PUT('/billing/policy', { body: change })
      if (data === undefined)
        throw new Error(`Enregistrement impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: (policy) => {
      queryClient.setQueryData([...key, 'policy'], policy)
    },
  })
}

// --- Impayés et relances (vraie API) ---

export interface UnpaidFilters {
  cycleId: string | null
  classroomId: string | null
}

/** Factures en retard (toutes années), le plus gros retard d'abord, dans les cycles de l'utilisateur. */
export function useUnpaid(filters: UnpaidFilters = { cycleId: null, classroomId: null }) {
  const { school, key } = useBillingKey()
  return useQuery({
    queryKey: [...key, 'unpaid', filters],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<UnpaidRow[]> => {
      const { data, error } = await api.GET('/billing/unpaid', {
        params: { query: { cycle_id: filters.cycleId, classroom_id: filters.classroomId } },
        signal,
      })
      if (data === undefined) throw new Error('Impayés indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Relance SMS des payeurs des factures choisies (un SMS par payeur, au plus tous les 7 jours). */
export function useRemind() {
  const { key } = useBillingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoiceIds: string[]): Promise<ReminderOutcome> => {
      const { data, response } = await api.POST('/billing/reminders', {
        body: { invoice_ids: invoiceIds },
      })
      if (data === undefined) throw new Error(`Relance impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...key, 'unpaid'] })
    },
  })
}
