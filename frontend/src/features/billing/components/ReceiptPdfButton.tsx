import { FileDown, LoaderCircle, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

import { useReceiptPdf, useRetryReceiptPdf } from '../api'

/**
 * Téléchargement du reçu PDF (rendu par l'API) : en préparation, prêt (lien signé de 10 minutes, ouvert dans un
 * nouvel onglet, sans Referer) ou en échec (nouvel essai).
 */
export function ReceiptPdfButton({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation()
  const query = useReceiptPdf(paymentId)
  const retry = useRetryReceiptPdf(paymentId)
  const pdf = query.data

  if (pdf === null) return null
  if (pdf === undefined || pdf.status === 'pending') {
    return (
      <Button variant="outline" disabled aria-live="polite">
        <LoaderCircle aria-hidden className="animate-spin" />
        {t('billing.receipt.pdfPending')}
      </Button>
    )
  }
  if (pdf.status === 'failed' || pdf.url === null) {
    return (
      <Button
        variant="outline"
        disabled={retry.isPending}
        onClick={() => {
          retry.mutate(undefined, {
            onError: () => {
              toast(t('billing.receipt.pdfFailed'), { tone: 'error' })
            },
          })
        }}
      >
        <RotateCcw aria-hidden />
        {t('billing.receipt.pdfRetry')}
      </Button>
    )
  }
  return (
    <Button asChild variant="outline">
      <a href={pdf.url} target="_blank" rel="noopener noreferrer">
        <FileDown aria-hidden />
        {pdf.cancelled ? t('billing.receipt.pdfCancelled') : t('billing.receipt.pdf')}
      </a>
    </Button>
  )
}
