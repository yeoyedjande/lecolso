import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
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
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { CYCLE_CHART } from '@/lib/cycles'
import { YEAR_LABEL } from '@/lib/demo/dates'
import {
  formatDayMonth,
  formatLongDate,
  formatMoney,
  formatShortMonth,
  formatTime,
} from '@/lib/format'

import { useDashboard } from './api'
import type { DashboardSummary } from './demo'

const ACTIVITY_ICONS = {
  payment: Wallet,
  enrollment: UserPlus,
  absence: CalendarCheck,
  grade: ClipboardCheck,
  message: CreditCard,
}

function compactMoney(value: number): string {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
  if (value >= 1000) return `${String(Math.round(value / 1000))} k`
  return String(value)
}

function Dashboard({ data }: { data: DashboardSummary }) {
  const { t } = useTranslation()
  const chart = useChartTheme()
  const school = useCurrentSchool()
  const finance = can(school, 'billing.view')
  const cycleData = data.byCycle.map((entry) => ({ ...entry, label: t(`cycles.${entry.cycle}`) }))

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
              count: data.byCycle.reduce((sum, c) => sum + c.classrooms, 0),
            })}
          />
        </Reveal>
        {finance && (
          <>
            <Reveal index={1}>
              <KpiCard
                label={t('dashboard.kpi.collected')}
                value={data.month.collected}
                format={formatMoney}
                icon={Wallet}
                tone="accent"
                hint={t('dashboard.kpi.collectedHint', {
                  amount: formatMoney(data.month.expected),
                })}
              />
            </Reveal>
            <Reveal index={2}>
              <KpiCard
                label={t('dashboard.kpi.overdue')}
                value={data.month.overdue}
                format={formatMoney}
                icon={AlertTriangle}
                tone="danger"
                hint={t('dashboard.kpi.overdueHint', { rate: data.collectionRate })}
              />
            </Reveal>
          </>
        )}
        <Reveal index={3}>
          <KpiCard
            label={t('dashboard.kpi.absences')}
            value={data.absentToday}
            format={String}
            icon={CalendarCheck}
            tone="success"
            hint={
              data.rollCallsMissing > 0
                ? t('dashboard.kpi.absencesHint', {
                    late: data.lateToday,
                    missing: data.rollCallsMissing,
                  })
                : t('dashboard.kpi.absencesHintDone', { late: data.lateToday })
            }
          />
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {finance && (
          <Reveal index={4} className="xl:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t('dashboard.monthly.title')}</CardTitle>
                <CardDescription>
                  {t('dashboard.monthly.description', { year: YEAR_LABEL })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64" aria-hidden>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.monthly}
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
                    {data.monthly.map((entry) => (
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

        <Reveal index={5} className={finance ? '' : 'xl:col-span-3'}>
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
                  <div key={entry.cycle} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{entry.label}</span>
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
        <Reveal index={6} className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('dashboard.attendance.title')}</CardTitle>
              <CardDescription>{t('dashboard.attendance.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56" aria-hidden>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.attendance}
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
                  {data.attendance.map((entry) => (
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

        <Reveal index={7}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('dashboard.activity.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dashboard.activity.empty')}</p>
              ) : (
                <ul className="grid gap-3">
                  {data.activity.map((entry) => {
                    const Icon = ACTIVITY_ICONS[entry.kind]
                    const student = entry.studentName ?? ''
                    const text =
                      entry.kind === 'payment'
                        ? t('dashboard.activity.payment', {
                            amount: formatMoney(entry.amount ?? 0),
                            student,
                          })
                        : t(`dashboard.activity.${entry.kind}`, { student })
                    return (
                      <li key={entry.id} className="flex items-start gap-3">
                        {entry.studentName !== null ? (
                          <Avatar name={entry.studentName} size="sm" />
                        ) : (
                          <span className="grid size-8 place-items-center rounded-full bg-muted">
                            <Icon aria-hidden className="size-4" />
                          </span>
                        )}
                        <div className="grid min-w-0 gap-0.5">
                          <p className="text-sm leading-snug">{text}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.classroom}
                            {' · '}
                            {formatDayMonth(entry.at.slice(0, 10))} {formatTime(entry.at)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
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
        description={
          query.data === undefined
            ? undefined
            : t('dashboard.today', { date: formatLongDate(query.data.today) })
        }
        actions={
          <>
            <Can permission="attendance.manage">
              <Button asChild variant="outline">
                <Link to="/gestion/presences">
                  <ClipboardCheck aria-hidden />
                  {t('dashboard.rollCall')}
                </Link>
              </Button>
            </Can>
            <Can permission="billing.manage">
              <Button asChild variant="accent">
                <Link to="/gestion/encaissements">
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
