import { Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, FileText, HeartPulse, Phone, Printer, Wallet, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Can } from '@/features/auth/RequirePermission'
import { demoToday, YEAR_LABEL } from '@/lib/demo/dates'
import { formatAverage, formatDay, formatDateTime, formatPhone, formatRank } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useStudent } from '../api'
import { absenceCount, type StudentDetail } from '../demo'

function Info({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function ageOf(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  if (by === undefined || bm === undefined || bd === undefined || ty === undefined || tm === undefined || td === undefined) return 0
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

function Detail({ detail }: { detail: StudentDetail }) {
  const { t } = useTranslation()
  const { student, classroom, balance } = detail
  const today = demoToday()
  const counts = absenceCount(detail)
  const paidShare = balance.expected === 0 ? 100 : Math.round((balance.paid / balance.expected) * 100)

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={detail.name} size="lg" />
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{detail.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CycleBadge code={classroom.cycle} label={classroom.name} />
              <span>{student.matricule}</span>
              <span aria-hidden>·</span>
              <span>{t('students.detail.age', { count: ageOf(student.birthDate, today) })}</span>
            </div>
          </div>
          <div className="grid gap-1 text-right">
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('students.detail.remaining')}</span>
            <MoneyAmount value={balance.remaining} className={cn('font-display text-2xl font-bold', balance.overdue > 0 && 'text-destructive-ink')} />
          </div>
        </div>
      </section>

      <Tabs defaultValue="identity">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            {(['identity', 'guardians', 'schooling', 'payments', 'grades', 'attendance', 'documents'] as const).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`students.detail.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="identity" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Info label={t('students.detail.matricule')}>{student.matricule}</Info>
                <Info label={t('students.detail.born')}>{formatDay(student.birthDate)}</Info>
                <Info label={t('students.detail.gender')}>{t(`students.detail.genders.${student.gender}`)}</Info>
                <Info label={t('students.detail.district')}>{student.district}</Info>
                <Info label={t('students.detail.enrolledAt')}>{formatDay(student.enrolledAt)}</Info>
                <Info label={t('students.detail.year')}>{YEAR_LABEL}</Info>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse aria-hidden className="size-5 text-cycle-daycare-ink" />
                {t('students.detail.medical')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <p>{student.medicalNote ?? t('students.detail.medicalNone')}</p>
              <p className="text-xs text-muted-foreground">{t('students.detail.medicalHint')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians" className="mt-4 grid gap-4 md:grid-cols-2">
          {student.guardians.map((guardian) => (
            <Card key={guardian.id}>
              <CardContent className="flex items-start gap-4 pt-6">
                <Avatar name={guardian.name} />
                <div className="grid min-w-0 flex-1 gap-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {guardian.name}
                    {guardian.isPayer && <Badge variant="accent">{t('students.detail.payerBadge')}</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {guardian.relation} · {guardian.profession}
                  </p>
                  <p className="tabular text-sm">{formatPhone(guardian.phone)}</p>
                </div>
                <Button asChild variant="outline" size="icon" aria-label={t('students.detail.call', { name: guardian.name })}>
                  <a href={`tel:${guardian.phone}`}>
                    <Phone aria-hidden />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="schooling" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Info label={t('students.classroom')}>{classroom.name}</Info>
                <Info label={t('students.cycle')}>{t(`cycles.${classroom.cycle}`)}</Info>
                <Info label={t('students.detail.teacher')}>{classroom.teacher}</Info>
                <Info label={t('students.detail.room')}>{classroom.room}</Info>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('students.detail.options')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {student.options.length === 0 ? (
                <p className="text-muted-foreground">{t('students.detail.noOptions')}</p>
              ) : (
                student.options.map((option) => (
                  <Badge key={option} variant="secondary">
                    {t(`fees.kinds.${option}`)}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ['expected', balance.expected, ''],
                ['paid', balance.paid, 'text-success-ink'],
                ['remaining', balance.remaining, ''],
                ['overdue', balance.overdue, balance.overdue > 0 ? 'text-destructive-ink' : ''],
              ] as const
            ).map(([key, value, tone]) => (
              <Card key={key}>
                <CardContent className="grid gap-1 pt-5">
                  <span className="text-sm text-muted-foreground">{t(`students.detail.${key}`)}</span>
                  <MoneyAmount value={value} className={cn('font-display text-xl font-bold', tone)} />
                </CardContent>
              </Card>
            ))}
          </div>
          <Progress value={paidShare} aria-label={t('students.detail.paid')} />
          <div className="flex justify-end">
            <Can permission="billing.manage">
              <Button asChild variant="accent">
                <Link to="/gestion/encaissements" search={{ eleve: student.id }}>
                  <Wallet aria-hidden />
                  {t('students.detail.collect')}
                </Link>
              </Button>
            </Can>
          </div>
          <Card className="overflow-hidden p-0">
            <CardHeader className="px-5 pt-5">
              <CardTitle>{t('students.detail.installments')}</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('students.detail.installments')}</TableHead>
                  <TableHead>{t('students.detail.dueDate')}</TableHead>
                  <TableHead className="text-right">{t('students.detail.amount')}</TableHead>
                  <TableHead className="text-right">{t('students.detail.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.installments.map((installment) => {
                  const state =
                    installment.paid >= installment.amount
                      ? 'statusPaid'
                      : installment.dueDate <= today
                        ? installment.paid > 0
                          ? 'statusPartial'
                          : 'statusLate'
                        : 'statusUpcoming'
                  return (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">{installment.label}</TableCell>
                      <TableCell>{formatDay(installment.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        <MoneyAmount value={installment.amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            state === 'statusPaid'
                              ? 'success'
                              : state === 'statusUpcoming'
                                ? 'secondary'
                                : state === 'statusPartial'
                                  ? 'accent'
                                  : 'destructive'
                          }
                        >
                          {t(`students.detail.${state}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
          <Card className="overflow-hidden p-0">
            <CardHeader className="px-5 pt-5">
              <CardTitle>{t('students.detail.history')}</CardTitle>
            </CardHeader>
            {detail.payments.length === 0 ? (
              <p className="px-5 pb-5 text-muted-foreground">{t('students.detail.noPayments')}</p>
            ) : (
              <Table>
                <TableBody>
                  {detail.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDateTime(payment.paidAt)}</TableCell>
                      <TableCell>{t(`paymentMethods.${payment.method}`)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <MoneyAmount value={payment.amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/gestion/recus/$paymentId" params={{ paymentId: payment.id }}>
                            <Printer aria-hidden />
                            {payment.receiptNumber}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-4 grid gap-4">
          {detail.results !== null ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="grid gap-1 pt-5">
                    <span className="text-sm text-muted-foreground">{t('students.detail.average')}</span>
                    <span className="font-display text-3xl font-bold tabular">{formatAverage(detail.results.average)}</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="grid gap-1 pt-5">
                    <span className="text-sm text-muted-foreground">{t('students.detail.rank')}</span>
                    <span className="font-display text-3xl font-bold">
                      {formatRank(detail.results.rank)}{' '}
                      <span className="text-base font-medium text-muted-foreground">
                        {t('students.detail.rankOf', { count: detail.results.size })}
                      </span>
                    </span>
                  </CardContent>
                </Card>
              </div>
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('students.detail.subject')}</TableHead>
                      <TableHead className="text-center">{t('students.detail.coefficient')}</TableHead>
                      <TableHead className="text-right">{t('students.detail.average')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.results.bySubject.map((subject) => (
                      <TableRow key={subject.name}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell className="text-center">{subject.coefficient}</TableCell>
                        <TableCell className={cn('tabular text-right font-semibold', subject.average !== null && subject.average < 10 && 'text-destructive-ink')}>
                          {formatAverage(subject.average)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : classroom.cycle === 'kindergarten' ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('students.detail.skills')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {detail.skills.map((skill) => (
                    <li key={skill.label} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <span>
                        <span className="text-xs text-muted-foreground">{skill.domain}</span>
                        <br />
                        {skill.label}
                      </span>
                      <Badge variant={skill.level === 'A' ? 'success' : skill.level === 'EA' ? 'accent' : skill.level === 'NA' ? 'destructive' : 'secondary'}>
                        {t(`skillLevels.${skill.level === 'A' || skill.level === 'EA' || skill.level === 'NA' ? skill.level : 'none'}`)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title={t('students.detail.noGrades')} />
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ['absences', counts.absent],
                ['lates', counts.late],
                ['unjustified', counts.unjustified],
              ] as const
            ).map(([key, value]) => (
              <Card key={key}>
                <CardContent className="grid gap-1 pt-5">
                  <span className="text-sm text-muted-foreground">{t(`students.detail.${key}`)}</span>
                  <span className="font-display text-3xl font-bold tabular">{value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {detail.attendance.length === 0 ? (
            <EmptyState title={t('students.detail.noAbsence')} />
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableBody>
                  {detail.attendance.map((entry) => (
                    <TableRow key={entry.date}>
                      <TableCell>{formatDay(entry.date)}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'late' ? 'accent' : 'destructive'}>{t(`attendanceStatus.${entry.status}`)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {t(entry.justified ? 'students.detail.justified' : 'students.detail.notJustified')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 grid gap-3">
          <p className="text-sm text-muted-foreground">{t('students.detail.documentsHint')}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(['birth', 'photo', 'vaccination', 'report'] as const).map((doc, index) => {
              const provided = classroom.cycle === 'primary' || doc !== 'report' ? (student.matricule.charCodeAt(student.matricule.length - 1) + index) % 4 !== 0 : false
              return (
                <li key={doc} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <FileText aria-hidden className="size-5 text-muted-foreground" />
                  <span className="flex-1 font-medium">{t(`students.detail.documents.${doc}`)}</span>
                  {provided ? (
                    <Badge variant="success">
                      <CheckCircle2 aria-hidden className="size-3.5" />
                      {t('students.detail.provided')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle aria-hidden className="size-3.5" />
                      {t('students.detail.missing')}
                    </Badge>
                  )}
                </li>
              )
            })}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Fiche élève à onglets. */
export function StudentDetailPage({ studentId }: { studentId: string }) {
  const { t } = useTranslation()
  const query = useStudent(studentId)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/gestion/eleves">
            <ArrowLeft aria-hidden />
            {t('students.detail.back')}
          </Link>
        </Button>
        <DemoBanner />
      </div>
      <QueryState query={query}>
        {(detail) =>
          detail === null ? (
            <EmptyState headingLevel={1} illustration="lost" title={t('students.detail.notFound')} />
          ) : (
            <Detail detail={detail} />
          )
        }
      </QueryState>
    </div>
  )
}
