import { useTranslation } from 'react-i18next'

import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDay } from '@/lib/format'

import { useSchedules } from '../api'

/** Échéanciers : attendu et encaissé par échéance (toutes classes). */
export function SchedulesPage() {
  const { t } = useTranslation()
  const query = useSchedules()

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('billing.schedules.title')} description={t('billing.schedules.description')} />
      <QueryState query={query}>
        {(rows) => (
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing.schedules.installment')}</TableHead>
                  <TableHead>{t('billing.schedules.dueDate')}</TableHead>
                  <TableHead className="text-right">{t('billing.schedules.expected')}</TableHead>
                  <TableHead className="text-right">{t('billing.schedules.collected')}</TableHead>
                  <TableHead className="w-48">{t('billing.schedules.rate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const rate = row.expected === 0 ? 0 : Math.round((row.collected / row.expected) * 100)
                  return (
                    <TableRow key={`${row.kind}-${row.dueDate}`}>
                      <TableCell>
                        <span className="grid">
                          <span className="font-medium">{row.label}</span>
                          <span className="text-xs text-muted-foreground">{t('billing.schedules.students', { count: row.students })}</span>
                        </span>
                      </TableCell>
                      <TableCell>{formatDay(row.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        <MoneyAmount value={row.expected} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <MoneyAmount value={row.collected} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={rate} aria-label={t('billing.schedules.rate')} className="flex-1" />
                          <span className="w-10 text-right text-sm font-semibold tabular">{`${String(rate)} %`}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
    </div>
  )
}
