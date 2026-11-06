import { Link } from '@tanstack/react-router'
import { ArrowLeft, Ban, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ConflictError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/format'
import { toast } from '@/lib/toast'

import { useCancelPayment, useReceipt, type Receipt } from '../api'
import { receiptContent } from '../receipt'
import { ReceiptSheet } from './ReceiptSheet'

export function ReceiptToolbar({
  backTo,
  children,
}: {
  backTo: '/$school/caisse' | '/$school/parent/paiements'
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link from="/$school" to={backTo}>
          <ArrowLeft aria-hidden />
          {t('billing.receipt.back')}
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button
          variant="accent"
          onClick={() => {
            window.print()
          }}
        >
          <Printer aria-hidden />
          {t('common.print')}
        </Button>
      </div>
    </div>
  )
}

function CancelPayment({ receipt }: { receipt: Receipt }) {
  const { t } = useTranslation()
  const cancel = useCancelPayment()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <Button
        variant="outline"
        className="text-destructive-ink"
        onClick={() => {
          setReason('')
          setError(null)
          setOpen(true)
        }}
      >
        <Ban aria-hidden />
        {t('billing.receipt.cancel')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{t('billing.receipt.cancelTitle')}</DialogTitle>
          <DialogDescription>
            {t('billing.receipt.cancelDescription', {
              number: receipt.payment.receipt_number,
              amount: formatMoney(receipt.payment.amount),
            })}
          </DialogDescription>
          {error !== null && <FormAlert>{error}</FormAlert>}
          <Field label={t('billing.receipt.cancelReason')}>
            {(control) => (
              <Input
                {...control}
                value={reason}
                maxLength={200}
                onChange={(event) => {
                  setReason(event.target.value)
                }}
              />
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || cancel.isPending}
              onClick={() => {
                setError(null)
                cancel
                  .mutateAsync({ paymentId: receipt.payment.id, reason: reason.trim() })
                  .then(() => {
                    setOpen(false)
                    toast(t('billing.receipt.cancelDone'), { tone: 'success' })
                  })
                  .catch((caught: unknown) => {
                    setError(
                      caught instanceof ConflictError && caught.code === 'cash_closed'
                        ? t('billing.cash.conflicts.cash_closed')
                        : t('common.error'),
                    )
                  })
              }}
            >
              {t('billing.receipt.cancelConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Reçu d'un paiement (vraie API) ; la direction peut l'annuler avec un motif. */
export function ReceiptPage({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation()
  const query = useReceipt(paymentId)

  return (
    <div className="grid gap-4">
      <QueryState query={query}>
        {(receipt) =>
          receipt === null ? (
            <>
              <ReceiptToolbar backTo="/$school/caisse" />
              <EmptyState
                headingLevel={1}
                illustration="lost"
                title={t('billing.receipt.notFound')}
              />
            </>
          ) : (
            <>
              <ReceiptToolbar backTo="/$school/caisse">
                {receipt.can_cancel && <CancelPayment receipt={receipt} />}
              </ReceiptToolbar>
              <ReceiptSheet receipt={receiptContent(receipt)} />
            </>
          )
        }
      </QueryState>
    </div>
  )
}
