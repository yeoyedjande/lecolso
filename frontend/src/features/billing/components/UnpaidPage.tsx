import { Link } from '@tanstack/react-router'
import { MessageSquareText, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Can } from '@/features/auth/RequirePermission'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { toast } from '@/lib/toast'

import { useMe } from '@/features/auth/api'
import { ConflictError } from '@/lib/api/errors'

import { useRemind, useUnpaid, type UnpaidRow } from '../api'

/** Aperçu du SMS, identique au texte envoyé (SendPaymentReminderSms::message). */
function smsPreview(rows: UnpaidRow[]): { names: string; amount: number } {
  const names = [...new Set(rows.map((row) => row.student.first_name))]
  const last = names.pop() ?? ''
  return {
    names: names.length === 0 ? last : `${names.join(', ')} et ${last}`,
    amount: rows.reduce((sum, row) => sum + row.overdue, 0),
  }
}

/**
 * Impayés (vraie API) : factures en retard, relance SMS groupée par payeur (au plus tous les 7 jours, envoi en file).
 */
/** Factures par relance (SendPaymentReminders::MAX_INVOICES) : au-delà, filtrer par cycle. */
const MAX_REMIND = 1000

const CYCLE_KEYS = ['daycare', 'kindergarten', 'primary']
type CycleKey = 'daycare' | 'kindergarten' | 'primary'

function cycleKey(code: string): CycleKey {
  return code === 'daycare' || code === 'kindergarten' ? code : 'primary'
}

function reminderStatus(status: string): 'queued' | 'sent' | 'failed' {
  return status === 'sent' || status === 'failed' ? status : 'queued'
}

export function UnpaidPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const query = useUnpaid()
  const remind = useRemind()
  // Sans fournisseur SMS configuré, aucune relance n'est proposée (rien ne serait réellement envoyé)
  const smsAvailable = useMe().data?.sms_available === true
  const [cycle, setCycle] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('billing.unpaid.title')}
        description={t('billing.unpaid.description')}
      />
      <QueryState query={query}>
        {(all) => {
          const rows = all.filter((row) => cycle === '' || row.cycle.id === cycle)
          const cycles = [...new Map(all.map((row) => [row.cycle.id, row.cycle])).values()]
          const remindable = smsAvailable ? rows.filter((row) => row.can_remind) : []
          const chosen = all.filter((row) => selected.has(row.invoice_id))
          const firstPayer = chosen[0]?.payer?.name
          const preview = smsPreview(chosen.filter((row) => row.payer?.name === firstPayer))
          // Année la plus récente des impayés : les dettes d'années antérieures portent leur année
          const latestYear = all.reduce(
            (max, row) => (row.academic_year_label > max ? row.academic_year_label : max),
            '',
          )
          const families = new Set(rows.map((row) => row.payer?.name ?? row.invoice_id)).size
          if (all.length === 0) return <EmptyState title={t('billing.unpaid.empty')} />
          return (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="grid gap-1 pt-5">
                    <span className="text-sm text-muted-foreground">
                      {t('billing.unpaid.total')}
                    </span>
                    <MoneyAmount
                      value={rows.reduce((sum, row) => sum + row.overdue, 0)}
                      className="font-display text-3xl font-bold text-destructive-ink"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="grid gap-1 pt-5">
                    <span className="text-sm text-muted-foreground">
                      {t('billing.unpaid.count')}
                    </span>
                    <span className="font-display text-3xl font-bold tabular">{families}</span>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <NativeSelect
                  aria-label={t('students.cycle')}
                  className="w-56"
                  value={cycle}
                  onChange={(event) => {
                    setCycle(event.target.value)
                    setSelected(new Set())
                  }}
                >
                  <option value="">{t('common.allCycles')}</option>
                  {cycles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {CYCLE_KEYS.includes(entry.code)
                        ? t(`cycles.${cycleKey(entry.code)}`)
                        : entry.code}
                    </option>
                  ))}
                </NativeSelect>
                {selected.size > MAX_REMIND && (
                  <p className="text-sm text-destructive-ink" role="status">
                    {t('billing.unpaid.tooMany', { max: MAX_REMIND })}
                  </p>
                )}
                {smsAvailable ? (
                  <Button
                    variant="accent"
                    disabled={selected.size === 0 || selected.size > MAX_REMIND}
                    onClick={() => {
                      setConfirming(true)
                    }}
                  >
                    <MessageSquareText aria-hidden />
                    {t('billing.unpaid.remind', { count: selected.size })}
                  </Button>
                ) : (
                  <p className="max-w-md text-sm text-muted-foreground">
                    {t('billing.unpaid.smsUnavailable')}
                  </p>
                )}
              </div>
              <Card className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        {remindable.length > 0 && (
                          <Checkbox
                            aria-label={t('billing.unpaid.selectAll')}
                            checked={remindable.every((row) => selected.has(row.invoice_id))}
                            onCheckedChange={(checked) => {
                              setSelected(
                                checked === true
                                  ? new Set(remindable.map((row) => row.invoice_id))
                                  : new Set(),
                              )
                            }}
                          />
                        )}
                      </TableHead>
                      <TableHead>{t('billing.unpaid.student')}</TableHead>
                      <TableHead>{t('billing.unpaid.payer')}</TableHead>
                      <TableHead className="text-right">{t('billing.unpaid.overdue')}</TableHead>
                      <TableHead className="text-right">{t('billing.unpaid.late')}</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">{t('common.actions')}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.invoice_id}>
                        <TableCell>
                          {row.can_remind && smsAvailable && (
                            <Checkbox
                              aria-label={t('billing.unpaid.select', {
                                name: row.student.full_name,
                              })}
                              checked={selected.has(row.invoice_id)}
                              onCheckedChange={(checked) => {
                                setSelected((previous) => {
                                  const next = new Set(previous)
                                  if (checked === true) next.add(row.invoice_id)
                                  else next.delete(row.invoice_id)
                                  return next
                                })
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            from="/$school"
                            to="/$school/eleves/$studentId"
                            params={{ studentId: row.student.id }}
                            className="grid font-semibold hover:underline"
                          >
                            {row.student.full_name}
                          </Link>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <CycleBadge code={row.cycle.code} label={row.classroom_name} />
                            {row.academic_year_label !== latestYear && (
                              <Badge variant="outline">{row.academic_year_label}</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {row.payer === null ? (
                            <span className="text-sm text-muted-foreground">
                              {t('billing.unpaid.noPayer')}
                            </span>
                          ) : (
                            <span className="grid">
                              <span>{row.payer.name}</span>
                              {row.payer.phone !== null && (
                                <span className="tabular text-xs text-muted-foreground">
                                  {formatPhone(row.payer.phone)}
                                </span>
                              )}
                              {row.last_reminder !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {t(
                                    `billing.unpaid.lastReminder.${reminderStatus(row.last_reminder.status)}`,
                                    {
                                      date: formatDate(row.last_reminder.at),
                                    },
                                  )}
                                </span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive-ink">
                          <MoneyAmount value={row.overdue} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.days_late > 30 ? 'destructive' : 'accent'}>
                            {t('billing.unpaid.days', { count: row.days_late })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Can permission="billing.manage">
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                from="/$school"
                                to="/$school/encaissements"
                                search={{ eleve: row.student.id, facture: row.invoice_id }}
                              >
                                <Wallet aria-hidden />
                                {t('students.detail.collect')}
                              </Link>
                            </Button>
                          </Can>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent closeLabel={t('common.close')}>
                  <DialogTitle>
                    {t('billing.unpaid.remindTitle', { count: selected.size })}
                  </DialogTitle>
                  <DialogDescription>{t('billing.unpaid.remindPreview')}</DialogDescription>
                  {chosen.length > 0 && (
                    <p className="rounded-2xl bg-muted p-4 text-sm">
                      {t('billing.unpaid.remindMessage', {
                        school: school?.name ?? '',
                        students: preview.names,
                        amount: formatMoney(preview.amount),
                      })}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{t('billing.unpaid.remindRule')}</p>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">{t('common.cancel')}</Button>
                    </DialogClose>
                    <Button
                      variant="accent"
                      disabled={remind.isPending}
                      onClick={() => {
                        remind
                          .mutateAsync([...selected])
                          .then((outcome) => {
                            setConfirming(false)
                            setSelected(new Set())
                            toast(t('billing.unpaid.reminded', { count: outcome.queued }), {
                              tone: outcome.queued > 0 ? 'success' : 'default',
                            })
                            if (outcome.recent > 0)
                              toast(t('billing.unpaid.skippedRecent', { count: outcome.recent }))
                            if (outcome.no_phone > 0)
                              toast(t('billing.unpaid.skippedNoPhone', { count: outcome.no_phone }))
                          })
                          .catch((error: unknown) => {
                            toast(
                              error instanceof ConflictError && error.code === 'sms_unavailable'
                                ? t('billing.unpaid.smsUnavailable')
                                : t('common.error'),
                              { tone: 'error' },
                            )
                          })
                      }}
                    >
                      {t('billing.unpaid.remindConfirm')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}
