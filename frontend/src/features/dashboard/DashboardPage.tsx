import { Link } from '@tanstack/react-router'
import { AlertTriangle, CalendarCheck, ClipboardCheck, Printer, Users, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useChartTheme } from '@/components/charts/chartTheme'
import { KpiCard } from '@/components/KpiCard'
import { Reveal } from '@/components/motion/Reveal'
import { ScreenHeader } from '@/components/ScreenHeader'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Can } from '@/features/auth/RequirePermission'
import { CYCLE_CHART, cycleTone } from '@/lib/cycles'
import {
  formatDayMonth,
  formatLongDate,
  formatMoney,
  formatShortMonth,
  formatTime,
} from '@/lib/format'

import { useDashboard, type DashboardData } from './api'

function compactMoney(value: number): string {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00a0M`
  if (value >= 1000) return `${String(Math.round(value / 1000))}\u00a0k`
  return String(value)
}

function Dashboard({ data }: { data: DashboardData }) {
  const { t } = useTranslation()
  const chart = useChartTheme()
  const attendance =
    data.attendance === null
      ? undefined
      : {
          absentToday: data.attendance.absent_today,
          lateToday: data.attendance.late_today,
          rollCallsMissing: data.attendance.roll_calls_missing,
          attendance: data.attendance.rates,
        }
  const { finance } = data
  const cycleData = data.by_cycle.map((entry) => ({ ...entry, cycle: cycleTone(entry.code) }))

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal index={0}>
          <KpiCard
            label={t('dashboard.kpi.students')}
            value={data.students}
            format={(value) => value.toLocaleString('fr-FR')}
            icon={Users}
            hint={t('dashboard.kpi.studentsHint', {
              count: data.by_cycle.reduce((sum, c) => sum + c.classrooms, 0),
            })}
          />
        </Reveal>
        {finance !== null && (
          <>
            <Reveal index={1}>
              <KpiCard
                label={t('dashboard.kpi.collected')}
                value={finance.collected_month}
                format={formatMoney}
                icon={Wallet}
                tone="accent"
                hint={t('dashboard.kpi.collectedHint', {
                  count: finance.payments_month,
                  expected: formatMoney(finance.expected_month),
                })}
              />
            </Reveal>
            <Reveal index={2}>
              <KpiCard
                label={t('dashboard.kpi.overdue')}
                value={finance.overdue}
                format={formatMoney}
                icon={AlertTriangle}
                tone="danger"
                hint={t('dashboard.kpi.overdueHint', { rate: finance.collection_rate })}
              />
            </Reveal>
          </>
        )}
        {attendance !== undefined && (
          <Reveal index={3}>
            <KpiCard
              label={t('dashboard.kpi.absences')}
              value={attendance.absentToday}
              format={String}
              icon={CalendarCheck}
              tone="success"
              hint={
                attendance.rollCallsMissing > 0
                  ? t('dashboard.kpi.absencesHint', {
                      late: attendance.lateToday,
                      missing: attendance.rollCallsMissing,
                    })
                  : t('dashboard.kpi.absencesHintDone', { late: attendance.lateToday })
              }
            />
          </Reveal>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {finance !== null && (
          <Reveal index={4} className="xl:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t('dashboard.monthly.title')}</CardTitle>
                <CardDescription>
                  {t('dashboard.monthly.description', { year: data.academic_year_label ?? '' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={finance.monthly}
                      margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
                      barCategoryGap="28%"
                    >
                      <CartesianGrid vertical={false} stroke={chart.grid} />
                      <XAxis
                        dataKey="month"
                        tickFormatter={formatShortMonth}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: chart.axis, fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={compactMoney}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fill: chart.axis, fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: chart.grid }}
                        content={({ active, payload, label }) => (
                          <ChartTooltip
                            active={active}
                            title={typeof label === 'string' ? formatShortMonth(label) : ''}
                            rows={[
                              {
                                label: t('dashboard.monthly.title'),
                                value: formatMoney(Number(payload[0]?.value ?? 0)),
                              },
                            ]}
                          />
                        )}
                      />
                      <Bar
                        dataKey="collected"
                        fill={chart.series}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={44}
                      >
                        <LabelList
                          dataKey="collected"
                          position="top"
                          formatter={(value) => compactMoney(Number(value))}
                          style={{ fill: chart.axis, fontSize: 11, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>{t('dashboard.monthly.title')}</caption>
                  <tbody>
                    {finance.monthly.map((entry) => (
                      <tr key={entry.month}>
                        <th scope="row">{formatShortMonth(entry.month)}</th>
                        <td>{formatMoney(entry.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </Reveal>
        )}

        <Reveal index={5} className={finance !== null ? '' : 'xl:col-span-3'}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('dashboard.cycles.title')}</CardTitle>
              <CardDescription>
                {t('dashboard.cycles.description', { count: data.students })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {cycleData.map((entry) => {
                const share =
                  data.students === 0 ? 0 : Math.round((entry.students / data.students) * 100)
                return (
                  <div key={entry.cycle_id} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{entry.name}</span>
                      <span className="text-muted-foreground">
                        <span className="tabular font-display text-base font-bold text-foreground">
                          {entry.students}
                        </span>
                        {' · '}
                        {t('dashboard.cycles.classes', { count: entry.classrooms })}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${String(share)}%`,
                          background: CYCLE_CHART[chart.dark ? 'dark' : 'light'][entry.cycle],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {attendance !== undefined && (
          <Reveal index={6} className="xl:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t('dashboard.attendance.title')}</CardTitle>
                <CardDescription>{t('dashboard.attendance.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={attendance.attendance}
                      margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke={chart.grid} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDayMonth}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: chart.axis, fontSize: 12 }}
                      />
                      <YAxis
                        domain={[80, 100]}
                        tickFormatter={(value: number) => `${String(value)} %`}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fill: chart.axis, fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ stroke: chart.axis, strokeDasharray: '4 4' }}
                        content={({ active, payload, label }) => (
                          <ChartTooltip
                            active={active}
                            title={typeof label === 'string' ? formatDayMonth(label) : ''}
                            rows={[
                              {
                                label: t('dashboard.attendance.rate'),
                                value: `${String(payload[0]?.value ?? '')} %`,
                              },
                            ]}
                          />
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke={chart.line}
                        strokeWidth={2}
                        dot={{ r: 4, fill: chart.line, stroke: chart.surface, strokeWidth: 2 }}
                        activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>{t('dashboard.attendance.title')}</caption>
                  <tbody>
                    {attendance.attendance.map((entry) => (
                      <tr key={entry.date}>
                        <th scope="row">{formatDayMonth(entry.date)}</th>
                        <td>{`${String(entry.rate)} %`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {finance !== null && (
          <Reveal index={7} className={attendance === undefined ? 'xl:col-span-3' : ''}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t('dashboard.activity.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {finance.recent_payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('dashboard.activity.empty')}</p>
                ) : (
                  <ul className="grid gap-3">
                    {finance.recent_payments.map((entry) => (
                      <li key={entry.payment_id} className="flex items-start gap-3">
                        <Avatar name={entry.student_name} size="sm" />
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <p className="text-sm leading-snug">
                            {t('dashboard.activity.payment', {
                              amount: formatMoney(entry.amount),
                              student: entry.student_name,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDayMonth(entry.paid_at.slice(0, 10))} {formatTime(entry.paid_at)}
                          </p>
                        </div>
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link
                            from="/$school"
                            to="/$school/recus/$paymentId"
                            params={{ paymentId: entry.payment_id }}
                            aria-label={t('dashboard.activity.receipt', {
                              number: entry.receipt_number,
                            })}
                          >
                            <Printer aria-hidden />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        )}
      </div>
    </div>
  )
}

/** Tableau de bord du back-office. */
export function DashboardPage() {
  const { t } = useTranslation()
  const query = useDashboard()

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('dashboard.title')}
        demo={false}
        description={
          query.data === undefined
            ? undefined
            : t('dashboard.today', { date: formatLongDate(query.data.today) })
        }
        actions={
          <>
            <Can permission="attendance.manage">
              <Button asChild variant="outline">
                <Link from="/$school" to="/$school/presences">
                  <ClipboardCheck aria-hidden />
                  {t('dashboard.rollCall')}
                </Link>
              </Button>
            </Can>
            <Can permission="billing.manage">
              <Button asChild variant="accent">
                <Link from="/$school" to="/$school/encaissements">
                  <Wallet aria-hidden />
                  {t('dashboard.collect')}
                </Link>
              </Button>
            </Can>
          </>
        }
      />
      <QueryState query={query} skeleton={<CardsSkeleton />}>
        {(data) => <Dashboard data={data} />}
      </QueryState>
    </div>
  )
}
