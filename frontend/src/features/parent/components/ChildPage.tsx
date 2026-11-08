import { Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarPlus, FileDown, Receipt, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TermSelect } from '@/components/ClassPicker'
import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAverage, formatDate, formatDateTime, formatDay, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useChild, type Child } from '../api'

import { MobileMoneyDialog } from './MobileMoneyDialog'
import { type ChildTab } from '../tabs'

const LEVEL_TONE: Record<string, string> = {
  A: 'bg-success-soft text-success-ink',
  EA: 'bg-orange-100 text-accent-ink',
  NA: 'bg-destructive-soft text-destructive-ink',
}

function Grades({ child }: { child: Child }) {
  const { t } = useTranslation()
  if (child.subjects.every((subject) => subject.assessments.length === 0)) {
    return <EmptyState title={t('parent.child.noGrades')} />
  }
  return (
    <ul className="grid gap-3">
      {child.subjects
        .filter((subject) => subject.assessments.length > 0)
        .map((subject) => (
          <li key={subject.id}>
            <Card>
              <CardContent className="grid gap-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{subject.name}</h3>
                  <span
                    className={cn(
                      'font-display text-lg font-bold tabular',
                      subject.average !== null &&
                        subject.average < child.grade_scale / 2 &&
                        'text-destructive-ink',
                    )}
                  >
                    {t('parent.child.subjectAverage', {
                      value: formatAverage(subject.average),
                      scale: child.grade_scale,
                    })}
                  </span>
                </div>
                <ul className="grid gap-1 text-sm">
                  {subject.assessments.map((assessment) => (
                    <li key={assessment.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {assessment.title}
                        <span className="text-muted-foreground">
                          {' '}
                          · {formatDay(assessment.date)}
                        </span>
                      </span>
                      <span className="font-semibold tabular">
                        {assessment.absent
                          ? t('parent.child.absentGrade')
                          : assessment.value === null
                            ? t('parent.child.notGraded')
                            : t('parent.child.grade', {
                                value: formatAverage(assessment.value),
                                outOf: assessment.out_of,
                              })}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </li>
        ))}
    </ul>
  )
}

function Skills({ child }: { child: Child }) {
  const { t } = useTranslation()
  const domains = [...new Set(child.skills.map((skill) => skill.domain))]
  if (child.skills.every((skill) => skill.level === null)) {
    return <EmptyState title={t('parent.child.noSkills')} />
  }
  return (
    <div className="grid gap-3">
      {domains.map((domain) => (
        <Card key={domain}>
          <CardHeader>
            <CardTitle className="text-base">{domain}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {child.skills
              .filter((skill) => skill.domain === domain)
              .map((skill) => (
                <div key={skill.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{skill.label}</span>
                  {skill.level === null ? (
                    <span className="text-muted-foreground">{t('parent.child.notEvaluated')}</span>
                  ) : (
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        LEVEL_TONE[skill.level],
                      )}
                    >
                      {t(
                        `skillLevels.${skill.level === 'A' ? 'A' : skill.level === 'EA' ? 'EA' : 'NA'}`,
                      )}
                    </span>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Planned({ child }: { child: Child }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="planned-title" className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="planned-title" className="font-display text-base font-semibold">
          {t('parent.plan.listTitle')}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link from="/$school" to="/$school/parent/prevenir" search={{ eleve: child.student.id }}>
            <CalendarPlus aria-hidden />
            {t('parent.plan.title')}
          </Link>
        </Button>
      </div>
      {child.planned_absences.length > 0 && (
        <ul className="grid gap-2">
          {child.planned_absences.map((planned) => (
            <li key={planned.id}>
              <Card>
                <CardContent className="grid gap-1 p-3 text-sm">
                  <span className="font-medium">
                    {planned.starts_on === planned.ends_on
                      ? t('parent.plan.on', { date: formatDate(planned.starts_on) })
                      : t('parent.plan.range', {
                          from: formatDate(planned.starts_on),
                          to: formatDate(planned.ends_on),
                        })}
                  </span>
                  <span className="text-muted-foreground">{planned.reason}</span>
                  <Badge
                    variant={
                      planned.status === 'accepted'
                        ? 'success'
                        : planned.status === 'refused'
                          ? 'destructive'
                          : 'outline'
                    }
                    className="w-fit"
                  >
                    {t(`parent.plan.status.${planned.status}`)}
                  </Badge>
                  {planned.note !== null && (
                    <span className="text-xs text-muted-foreground">{planned.note}</span>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Absences({ child }: { child: Child }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-5">
      <Planned child={child} />
      {child.absences.length === 0 ? (
        <EmptyState title={t('parent.child.noAbsence')} />
      ) : (
        <ul className="grid gap-2">
          {child.absences.map((mark) => (
            <li key={mark.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <span className="grid min-w-0 flex-1">
                    <span className="font-medium first-letter:uppercase">
                      {formatDate(mark.date)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {mark.status === 'late'
                        ? t('parent.child.late', { minutes: mark.late_minutes ?? 0 })
                        : t('parent.child.absent')}
                    </span>
                    {mark.justification !== null && (
                      <Badge
                        variant={
                          mark.justification.status === 'accepted'
                            ? 'success'
                            : mark.justification.status === 'refused'
                              ? 'destructive'
                              : 'outline'
                        }
                        className="mt-1 w-fit"
                      >
                        {mark.justification.status === 'accepted'
                          ? t('parent.child.justified')
                          : mark.justification.status === 'refused'
                            ? t('parent.child.refused')
                            : t('parent.child.pending')}
                      </Badge>
                    )}
                  </span>
                  {mark.can_justify && (
                    <Button asChild variant="outline" size="lg">
                      <Link
                        from="/$school"
                        to="/$school/parent/justifier"
                        search={{ eleve: child.student.id, absence: mark.id }}
                      >
                        {t('parent.child.justify')}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Reports({ child }: { child: Child }) {
  const { t } = useTranslation()
  if (child.report_cards.length === 0) return <EmptyState title={t('parent.child.noReport')} />
  return (
    <ul className="grid gap-2">
      {child.report_cards.map((report) => (
        <li key={report.id}>
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <span className="grid min-w-0 flex-1">
                <span className="font-medium">{report.term}</span>
                <span className="text-sm text-muted-foreground">
                  {t('parent.child.validatedOn', { date: formatDateTime(report.validated_at) })}
                </span>
              </span>
              <Button asChild variant="accent" size="lg">
                <a href={report.pdf_url} target="_blank" rel="noreferrer">
                  <FileDown aria-hidden />
                  {t('parent.child.openReport')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function PayButton({ child }: { child: Child }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!child.mobile_money.available)
    return (
      <p className="rounded-xl bg-muted p-3 text-sm" role="note">
        {t('parent.payments.soon')}
      </p>
    )
  if (child.balance === null || child.balance.remaining <= 0) return null
  return (
    <>
      <Button
        size="lg"
        variant="accent"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Wallet aria-hidden />
        {t('parent.payments.pay')}
      </Button>
      <MobileMoneyDialog studentId={child.student.id} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function Fees({ child }: { child: Child }) {
  const { t } = useTranslation()
  const balance = child.balance
  if (balance === null) return <EmptyState title={t('parent.payments.noInvoice')} />
  return (
    <div className="grid gap-3">
      <Card>
        <CardContent className="grid gap-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t('parent.payments.remaining')}</span>
            <MoneyAmount value={balance.remaining} className="font-display text-xl font-bold" />
          </div>
          {balance.overdue > 0 && (
            <p className="text-sm font-semibold text-destructive-ink">
              {t('parent.home.overdue', { amount: formatMoney(balance.overdue) })}
            </p>
          )}
          {balance.next !== null && (
            <p className="text-sm">
              {t('parent.payments.next', {
                date: formatDay(balance.next.due_on),
                amount: formatMoney(balance.next.amount),
              })}
            </p>
          )}
          <PayButton child={child} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('parent.payments.schedule')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          {balance.schedule.map((installment) => (
            <div
              key={`${installment.due_on}-${installment.label}`}
              className="flex justify-between gap-3"
            >
              <span>
                {installment.label}
                <span className="text-muted-foreground"> · {formatDay(installment.due_on)}</span>
              </span>
              <span
                className={cn(
                  'tabular',
                  installment.settled >= installment.amount && 'text-success-ink',
                )}
              >
                {t('parent.payments.installment', {
                  settled: formatMoney(installment.settled),
                  amount: formatMoney(installment.amount),
                })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('parent.payments.history')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {child.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('parent.payments.noPayment')}</p>
          ) : (
            child.payments.map((payment) => (
              <Link
                key={payment.id}
                from="/$school"
                to="/$school/parent/recus/$paymentId"
                params={{ paymentId: payment.id }}
                className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm"
              >
                <Receipt aria-hidden className="size-4 text-muted-foreground" />
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium">
                    {t('parent.payments.receipt', { number: payment.receipt_number })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(payment.paid_at)}
                    {payment.cancelled ? ` · ${t('parent.payments.cancelled')}` : ''}
                  </span>
                </span>
                <MoneyAmount
                  value={payment.amount}
                  className={cn('font-semibold', payment.cancelled && 'line-through')}
                />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const TAB_VALUES: Record<ChildTab, string> = {
  notes: 'grades',
  absences: 'absences',
  bulletins: 'reports',
  frais: 'fees',
}

/** Fiche d'un enfant : notes de la période au fil de l'eau, absences, bulletins validés, frais (2 écrans au plus). */
export function ChildPage({ studentId, tab }: { studentId: string; tab?: ChildTab | undefined }) {
  const { t } = useTranslation()
  const [termId, setTermId] = useState<string | null>(null)
  const query = useChild(studentId, termId)

  return (
    <div className="grid gap-5">
      <Button asChild variant="ghost" className="justify-self-start">
        <Link from="/$school" to="/$school/parent">
          <ArrowLeft aria-hidden />
          {t('parent.child.back')}
        </Link>
      </Button>
      <QueryState query={query} skeleton={<ListSkeleton />}>
        {(child) => {
          if (child === null) {
            return (
              <EmptyState headingLevel={1} illustration="lost" title={t('states.notFound.title')} />
            )
          }
          const graded = child.assessment_mode === 'weighted_average'
          const skills = child.assessment_mode === 'competency'
          return (
            <div className="grid gap-5">
              <div className="flex items-center gap-3">
                <Avatar
                  name={child.student.full_name}
                  photoUrl={child.student.photo_url}
                  size="lg"
                />
                <div className="grid gap-1">
                  <h1 className="font-display text-2xl font-bold">{child.student.full_name}</h1>
                  {child.student.classroom !== null && (
                    <CycleBadge
                      code={child.student.cycle?.code}
                      label={child.student.classroom.name ?? ''}
                      className="w-fit"
                    />
                  )}
                </div>
              </div>
              <Tabs
                defaultValue={
                  tab !== undefined && (tab !== 'notes' || graded || skills)
                    ? TAB_VALUES[tab]
                    : graded || skills
                      ? 'grades'
                      : 'absences'
                }
                className="min-w-0"
              >
                <TabsList className="w-full">
                  {(graded || skills) && (
                    <TabsTrigger value="grades">
                      {skills ? t('parent.child.tabs.skills') : t('parent.child.tabs.grades')}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="absences">{t('parent.child.tabs.absences')}</TabsTrigger>
                  <TabsTrigger value="reports">{t('parent.child.tabs.reports')}</TabsTrigger>
                  <TabsTrigger value="fees">{t('parent.child.tabs.fees')}</TabsTrigger>
                </TabsList>
                {(graded || skills) && (
                  <TabsContent value="grades" className="mt-4 grid gap-3">
                    {child.terms.length > 1 && (
                      <TermSelect
                        terms={child.terms}
                        value={child.term?.id ?? ''}
                        onChange={setTermId}
                      />
                    )}
                    {graded ? <Grades child={child} /> : <Skills child={child} />}
                    {graded && (
                      <p className="text-xs text-muted-foreground">
                        {t('parent.child.gradesHint')}
                      </p>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="absences" className="mt-4">
                  <Absences child={child} />
                </TabsContent>
                <TabsContent value="reports" className="mt-4">
                  <Reports child={child} />
                </TabsContent>
                <TabsContent value="fees" className="mt-4">
                  <Fees child={child} />
                </TabsContent>
              </Tabs>
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}
