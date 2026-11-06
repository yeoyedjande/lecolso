import { Link } from '@tanstack/react-router'
import { ArrowLeft, Baby, Bed, FileText, Heart, Palette, Smile, Utensils } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCycleSettings } from '@/features/cycles/useCycleSettings'
import { useReportCard } from '@/features/grades/demoApi'
import { ReportDocument } from '@/features/grades/components/ReportDocument'
import { formatAverage, formatDay, formatRank } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useChild } from '../api'
import type { ChildDetail } from '../demo'

const LOG_ICONS = {
  meal: Utensils,
  nap: Bed,
  diaper: Baby,
  mood: Smile,
  activity: Palette,
  health: Heart,
} as const

function Report({
  studentId,
  kind,
  termLabel,
}: {
  studentId: string
  kind: 'report_card' | 'skills_booklet'
  termLabel: string
}) {
  const query = useReportCard(studentId, 1, kind)
  return (
    <QueryState query={query}>
      {(data) => (data === null ? null : <ReportDocument data={data} termLabel={termLabel} />)}
    </QueryState>
  )
}

function Child({ child }: { child: ChildDetail }) {
  const { t } = useTranslation()
  const { settings, loading } = useCycleSettings()
  const [reportOpen, setReportOpen] = useState(false)
  const cycle = settings[child.classroom.cycle]
  const mode = cycle?.assessment_mode ?? 'observation'
  const report = cycle?.report_document ?? 'none'
  const daily = cycle?.daily_log ?? 'none'
  const kind = report === 'skills_booklet' ? 'skills_booklet' : 'report_card'
  const termLabel = t('reportCards.term', {
    type: t(`grades.termTypes.${cycle?.term_type ?? 'trimester'}`),
    number: 1,
  })
  const absences = child.attendance.filter((a) => a.status !== 'late')
  const tabs = [
    ...(mode === 'weighted_average'
      ? (['grades'] as const)
      : mode === 'competency'
        ? (['skills'] as const)
        : []),
    ...(report !== 'none' ? (['reports'] as const) : []),
    'absences' as const,
    ...(daily !== 'none' ? (['daycare'] as const) : []),
  ]

  // Les onglets dépendent des paramètres du cycle : on attend qu'ils soient chargés
  if (loading) return <ListSkeleton />

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Avatar name={child.name} size="lg" />
        <div className="grid gap-1">
          <h1 className="font-display text-2xl font-bold">{child.student.firstName}</h1>
          <CycleBadge code={child.classroom.cycle} label={child.classroom.name} className="w-fit" />
        </div>
      </div>
      <Tabs defaultValue={tabs[0]}>
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <TabsList className="w-max">
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="min-h-11">
                {t(`parent.child.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="grades" className="mt-4 grid gap-3">
          {child.results?.average == null ? (
            <EmptyState title={t('parent.child.noGrades')} />
          ) : (
            <>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('parent.child.average')}</p>
                    <p className="text-sm">
                      {t('parent.child.rank', {
                        rank: formatRank(child.results.rank),
                        count: child.results.size,
                      })}
                    </p>
                  </div>
                  <span className="font-display text-4xl font-bold tabular">
                    {formatAverage(child.results.average)}
                  </span>
                </CardContent>
              </Card>
              <ul className="grid gap-2">
                {child.results.bySubject.map((subject) => (
                  <li
                    key={subject.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
                  >
                    <span className="text-sm font-medium">{subject.name}</span>
                    <span
                      className={cn(
                        'font-display text-lg font-bold tabular',
                        subject.average !== null && subject.average < 10 && 'text-destructive-ink',
                      )}
                    >
                      {formatAverage(subject.average)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="skills" className="mt-4 grid gap-2">
          {child.skills.map((skill) => (
            <div
              key={skill.label}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
            >
              <span className="grid">
                <span className="text-xs text-muted-foreground">{skill.domain}</span>
                <span className="text-sm font-medium">{skill.label}</span>
              </span>
              <Badge
                variant={
                  skill.level === 'A'
                    ? 'success'
                    : skill.level === 'EA'
                      ? 'accent'
                      : skill.level === 'NA'
                        ? 'destructive'
                        : 'secondary'
                }
              >
                {t(
                  `skillLevels.${skill.level === 'A' || skill.level === 'EA' || skill.level === 'NA' ? skill.level : 'none'}`,
                )}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText aria-hidden className="size-6 text-accent-ink" />
              <span className="flex-1 font-medium">
                {t('parent.child.report', {
                  type: t(
                    kind === 'report_card' ? 'reportCards.reportCard' : 'reportCards.skillsBooklet',
                  ),
                  term: termLabel,
                })}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setReportOpen(true)
                }}
              >
                {t('parent.child.reportOpen')}
              </Button>
            </CardContent>
          </Card>
          <Sheet open={reportOpen} onOpenChange={setReportOpen}>
            <SheetContent
              side="bottom"
              closeLabel={t('parent.child.reportClose')}
              className="h-[92dvh] overflow-y-auto bg-[#e8e1d6] p-2 pt-12"
            >
              <SheetTitle className="sr-only">
                {t(kind === 'report_card' ? 'reportCards.reportCard' : 'reportCards.skillsBooklet')}
              </SheetTitle>
              <SheetDescription className="sr-only">{termLabel}</SheetDescription>
              <Report studentId={child.student.id} kind={kind} termLabel={termLabel} />
            </SheetContent>
          </Sheet>
        </TabsContent>

        <TabsContent value="absences" className="mt-4 grid gap-2">
          <h2 className="font-semibold">{t('parent.child.absences')}</h2>
          {absences.length === 0 ? (
            <EmptyState title={t('parent.child.noAbsence')} />
          ) : (
            <ul className="grid gap-2">
              {absences.map((absence) => (
                <li
                  key={absence.date}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
                >
                  <span className="font-medium">{formatDay(absence.date)}</span>
                  {absence.justified ? (
                    <Badge variant="success">{t('parent.child.justified')}</Badge>
                  ) : (
                    <Button asChild size="sm" variant="accent">
                      <Link
                        from="/$school"
                        to="/$school/parent/justifier"
                        search={{ eleve: child.student.id, date: absence.date }}
                      >
                        {t('parent.child.justify')}
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="daycare" className="mt-4">
          {child.daycareLogs.length === 0 ? (
            <EmptyState title={t('parent.child.noLog')} />
          ) : (
            <ol className="grid gap-3 border-l-2 border-cycle-daycare/40 pl-4">
              {child.daycareLogs.map((log) => {
                const Icon = LOG_ICONS[log.kind]
                return (
                  <li key={log.id} className="relative grid gap-0.5">
                    <span className="absolute top-1 -left-[1.6rem] grid size-6 place-items-center rounded-full bg-cycle-daycare-soft">
                      <Icon aria-hidden className="size-3.5 text-cycle-daycare-ink" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {log.time} · {t(`daycare.kinds.${log.kind}`)}
                    </span>
                    <span>{log.note}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Fiche d'un enfant pour son parent : onglets choisis d'après les paramètres du cycle. */
export function ChildPage({ studentId }: { studentId: string }) {
  const { t } = useTranslation()
  const query = useChild(studentId)
  return (
    <div className="grid gap-4">
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link from="/$school" to="/$school/parent">
          <ArrowLeft aria-hidden />
          {t('parent.child.back')}
        </Link>
      </Button>
      <QueryState query={query}>
        {(child) =>
          child === null ? (
            <EmptyState headingLevel={1} illustration="lost" title={t('states.notFound.title')} />
          ) : (
            <Child child={child} />
          )
        }
      </QueryState>
    </div>
  )
}
