import { useTranslation } from 'react-i18next'

import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDay } from '@/lib/format'

import { useBillingSchedules } from '../api'

/**
 * Échéancier de l'année (vraie API) : montant attendu à chaque date, toutes factures confondues.
 * Les montants encaissés et le taux de recouvrement arrivent avec les encaissements.
 */
export function SchedulesPage() {
  const { t } = useTranslation()
  const query = useBillingSchedules()

  return (
    <div className="grid grid-cols-1 gap-6">
      <ScreenHeader
        title={t('billing.schedules.title')}
        description={t('billing.schedules.description')}
      />
      <QueryState query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title={t('billing.schedules.emptyTitle')}
              description={t('billing.schedules.emptyDescription')}
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('billing.schedules.installment')}</TableHead>
                    <TableHead>{t('billing.schedules.dueDate')}</TableHead>
                    <TableHead className="text-right">{t('billing.schedules.expected')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.due_on}>
                      <TableCell>
                        <span className="grid">
                          <span className="font-medium">{row.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {t('billing.schedules.students', { count: row.invoices })}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>{formatDay(row.due_on)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <MoneyAmount value={row.expected} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">
                      {t('billing.schedules.total')}
                    </TableCell>
                    <TableCell className="text-right font-display text-lg font-bold">
                      <MoneyAmount value={rows.reduce((sum, row) => sum + row.expected, 0)} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )
        }
      </QueryState>
    </div>
  )
}
