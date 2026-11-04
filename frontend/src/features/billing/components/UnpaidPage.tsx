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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Can } from '@/features/auth/RequirePermission'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { formatMoney, formatPhone } from '@/lib/format'
import type { CycleCode } from '@/lib/demo/types'
import { toast } from '@/lib/toast'

import { useRemind, useUnpaid } from '../api'

/** Impayés : retard par famille, relance groupée par SMS (simulée en démonstration). */
export function UnpaidPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const query = useUnpaid()
  const remind = useRemind()
  const [cycle, setCycle] = useState<CycleCode | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('billing.unpaid.title')} description={t('billing.unpaid.description')} />
      <QueryState query={query}>
        {(all) => {
          const rows = all.filter((row) => cycle === '' || row.cycle === cycle)
          const first = rows.find((row) => selected.has(row.student.id)) ?? rows[0]
          if (all.length === 0) return <EmptyState title={t('billing.unpaid.empty')} />
          return (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="grid gap-1 pt-5">
                    <span className="text-sm text-muted-foreground">{t('billing.unpaid.total')}</span>
                    <MoneyAmount value={rows.reduce((sum, row) => sum + row.overdue, 0)} className="font-display text-3xl font-bold text-destructive-ink" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="grid gap-1 pt-5">
                    <span className="text-sm text-muted-foreground">{t('billing.unpaid.count')}</span>
                    <span className="font-display text-3xl font-bold tabular">{rows.length}</span>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <NativeSelect
                  aria-label={t('students.cycle')}
                  className="w-56"
                  value={cycle}
                  onChange={(event) => {
                    const value = event.target.value
                    setCycle(value === 'daycare' || value === 'kindergarten' || value === 'primary' ? value : '')
                  }}
                >
                  <option value="">{t('common.allCycles')}</option>
                  <option value="daycare">{t('cycles.daycare')}</option>
                  <option value="kindergarten">{t('cycles.kindergarten')}</option>
                  <option value="primary">{t('cycles.primary')}</option>
                </NativeSelect>
                <Button
                  variant="accent"
                  disabled={selected.size === 0}
                  onClick={() => {
                    setConfirming(true)
                  }}
                >
                  <MessageSquareText aria-hidden />
                  {t('billing.unpaid.remind', { count: selected.size })}
                </Button>
              </div>
              <Card className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          aria-label={t('billing.unpaid.selectAll')}
                          checked={rows.length > 0 && rows.every((row) => selected.has(row.student.id))}
                          onCheckedChange={(checked) => {
                            setSelected(checked === true ? new Set(rows.map((row) => row.student.id)) : new Set())
                          }}
                        />
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
                      <TableRow key={row.student.id}>
                        <TableCell>
                          <Checkbox
                            aria-label={t('billing.unpaid.select', { name: `${row.student.lastName} ${row.student.firstName}` })}
                            checked={selected.has(row.student.id)}
                            onCheckedChange={(checked) => {
                              setSelected((previous) => {
                                const next = new Set(previous)
                                if (checked === true) next.add(row.student.id)
                                else next.delete(row.student.id)
                                return next
                              })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Link to="/gestion/eleves/$studentId" params={{ studentId: row.student.id }} className="grid font-semibold hover:underline">
                            {row.student.lastName} {row.student.firstName}
                          </Link>
                          <CycleBadge code={row.cycle} label={row.classroom} className="mt-1" />
                        </TableCell>
                        <TableCell>
                          <span className="grid">
                            <span>{row.payerName}</span>
                            <span className="tabular text-xs text-muted-foreground">{formatPhone(row.payerPhone)}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive-ink">
                          <MoneyAmount value={row.overdue} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.daysLate > 30 ? 'destructive' : 'accent'}>{t('billing.unpaid.days', { count: row.daysLate })}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Can permission="billing.manage">
                            <Button asChild variant="ghost" size="sm">
                              <Link to="/gestion/encaissements" search={{ eleve: row.student.id }}>
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
                  <DialogTitle>{t('billing.unpaid.remindTitle', { count: selected.size })}</DialogTitle>
                  <DialogDescription>{t('billing.unpaid.remindPreview')}</DialogDescription>
                  {first !== undefined && (
                    <p className="rounded-2xl bg-muted p-4 text-sm">
                      {t('billing.unpaid.remindMessage', {
                        school: school?.name ?? '',
                        student: first.student.firstName,
                        amount: formatMoney(first.overdue),
                      })}
                    </p>
                  )}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">{t('common.cancel')}</Button>
                    </DialogClose>
                    <Button
                      variant="accent"
                      onClick={() => {
                        void remind.mutateAsync([...selected]).then((count) => {
                          setConfirming(false)
                          setSelected(new Set())
                          toast(t('billing.unpaid.reminded', { count }), { tone: 'success' })
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
