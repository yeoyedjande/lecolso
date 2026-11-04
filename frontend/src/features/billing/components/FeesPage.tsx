import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { YEAR_LABEL } from '@/lib/demo/dates'
import type { DemoLevel, FeeKind } from '@/lib/demo/types'
import { toast } from '@/lib/toast'

import { parseAmount } from '../amount'
import { useFees, useUpdateFee } from '../api'

const KINDS: FeeKind[] = ['registration', 'tuition', 'canteen', 'transport', 'daycare']

/** Grille de frais par niveau (montants annuels), modifiable par la direction et la comptabilité. */
export function FeesPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const editable = can(school, 'billing.manage')
  const query = useFees()
  const update = useUpdateFee()
  const [editing, setEditing] = useState<{ level: DemoLevel; kind: FeeKind; amount: number } | null>(null)
  const [text, setText] = useState('')
  const amount = parseAmount(text)

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('billing.fees.title')} description={t('billing.fees.description', { year: YEAR_LABEL })} />
      <QueryState query={query}>
        {({ levels, fees }) => (
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing.fees.level')}</TableHead>
                  {KINDS.map((kind) => (
                    <TableHead key={kind} className="text-right">
                      {t(`fees.kinds.${kind}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level) => (
                  <TableRow key={level.code}>
                    <TableCell>
                      <CycleBadge code={level.cycle} label={level.name} />
                    </TableCell>
                    {KINDS.map((kind) => {
                      const fee = fees.find((candidate) => candidate.levelCode === level.code && candidate.kind === kind)
                      if (fee === undefined) {
                        return (
                          <TableCell key={kind} className="text-right text-muted-foreground">
                            —
                          </TableCell>
                        )
                      }
                      return (
                        <TableCell key={kind} className="text-right">
                          <span className="inline-flex items-center gap-1">
                            <span className="grid">
                              <MoneyAmount value={fee.amount} className="font-semibold" />
                              <span className="text-xs text-muted-foreground">
                                {fee.optional ? `${t('billing.fees.optional')} · ` : ''}
                                {t('billing.fees.installments', { count: fee.installments })}
                              </span>
                            </span>
                            {editable && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t('billing.fees.edit', { kind: t(`fees.kinds.${kind}`), level: level.name })}
                                onClick={() => {
                                  setEditing({ level, kind, amount: fee.amount })
                                  setText(String(fee.amount))
                                }}
                              >
                                <Pencil aria-hidden />
                              </Button>
                            )}
                          </span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {editing !== null && t('billing.fees.editTitle', { kind: t(`fees.kinds.${editing.kind}`), level: editing.level.name })}
          </DialogTitle>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (editing === null || amount === null) return
              void update.mutateAsync({ levelCode: editing.level.code, kind: editing.kind, amount }).then(() => {
                setEditing(null)
                toast(t('billing.fees.saved'), { tone: 'success' })
              })
            }}
          >
            <Field label={t('billing.fees.amount')} error={amount === null ? t('billing.collect.errors.amount') : undefined}>
              {(control) => (
                <Input
                  {...control}
                  inputMode="numeric"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                  }}
                />
              )}
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={amount === null || update.isPending}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
