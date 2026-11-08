import type { Receipt } from './api'
import type { ReceiptContent } from './components/ReceiptSheet'

/** Contenu imprimable d'un reçu renvoyé par l'API (back-office et espace parent). */
export function receiptContent(receipt: Receipt): ReceiptContent {
  const { payment } = receipt
  return {
    number: payment.receipt_number,
    paidAt: payment.paid_at,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    payer: payment.payer_name,
    studentName: receipt.student.full_name,
    matricule: receipt.student.matricule,
    classroom: receipt.classroom_name,
    yearLabel: receipt.academic_year_label,
    remaining: receipt.remaining,
    cashier: payment.cashier_name,
    school: {
      name: receipt.school.name,
      address: receipt.school.address,
      phone: receipt.school.phone,
      logoUrl: receipt.school.logo_url,
    },
    cancellation:
      payment.cancellation === null
        ? null
        : {
            reason: payment.cancellation.reason,
            at: payment.cancellation.cancelled_at,
            by: payment.cancellation.cancelled_by_name,
          },
  }
}

/** Barre d'actions d'un reçu (retour, impression), masquée à l'impression. */
