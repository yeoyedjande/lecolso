import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { termCount } from '@/features/cycles/useCycleSettings'
import type { SkillLevel } from '@/lib/demo/types'
import { cn } from '@/lib/utils'

import { useSetSkill, useSkillMatrix } from '../api'
import { usePedagogyClasses } from '@/features/cycles/usePedagogyClasses'

import { ClassPicker, TermPicker } from '@/components/ClassPicker'

const NEXT: Record<SkillLevel | 'none', SkillLevel | null> = { none: 'A', A: 'EA', EA: 'NA', NA: null }
const TONE: Record<SkillLevel | 'none', string> = {
  A: 'bg-success-soft text-success-ink border-success/40',
  EA: 'bg-orange-100 text-accent-ink border-accent/40 dark:bg-orange/15',
  NA: 'bg-destructive-soft text-destructive-ink border-destructive/40',
  none: 'bg-surface text-muted-foreground border-dashed',
}

/** Livret de compétences (classes évaluées par compétences) : un clic fait évoluer le niveau. */
export function SkillsPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const editable = can(school, 'grades.manage')
  const { classrooms, settingsOf, loading } = usePedagogyClasses('grades.view', (settings) => settings.assessment_mode === 'competency')
  const [classroomId, setClassroomId] = useState('')
  const [term, setTerm] = useState(1)
  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]
  const settings = settingsOf(classroom)
  const matrix = useSkillMatrix(classroom?.id ?? '', term)
  const setSkill = useSetSkill()

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('skills.title')} description={t('skills.description')} />
      {loading ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('skills.noClass')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap items-center gap-2 text-sm" aria-label={t('skills.legend')}>
              {(['A', 'EA', 'NA'] as const).map((level) => (
                <li key={level} className={cn('rounded-full border px-3 py-1 font-semibold', TONE[level])}>
                  {t(`skillLevelsShort.${level}`)} — {t(`skillLevels.${level}`)}
                </li>
              ))}
            </ul>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <ClassPicker classrooms={classrooms} value={classroom.id} onChange={setClassroomId} />
              <TermPicker count={termCount(settings)} type={settings?.term_type ?? 'free_period'} value={term} onChange={setTerm} />
            </div>
          </div>
          <QueryState query={matrix}>
            {(data) => {
              const total = data.rows.length * data.domains.reduce((sum, domain) => sum + domain.skills.length, 0)
              const done = data.rows.reduce((sum, row) => sum + Object.values(row.levels).filter((level) => level !== null).length, 0)
              return (
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground">{t('skills.progress', { done, total })}</p>
                  <Card className="overflow-hidden p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2} className="sticky left-0 z-10 min-w-44 bg-card">
                            {t('grades.student')}
                          </TableHead>
                          {data.domains.map((domain) => (
                            <TableHead key={domain.name} colSpan={domain.skills.length} className="border-l text-center">
                              {domain.name}
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow>
                          {data.domains.flatMap((domain) =>
                            domain.skills.map((skill, index) => (
                              <TableHead key={skill.id} className={cn('min-w-28 text-center text-xs font-normal whitespace-normal', index === 0 && 'border-l')}>
                                {skill.label}
                              </TableHead>
                            )),
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.rows.map((row) => (
                          <TableRow key={row.student.id}>
                            <TableCell className="sticky left-0 z-10 bg-card font-medium">{row.name}</TableCell>
                            {data.domains.flatMap((domain) =>
                              domain.skills.map((skill, index) => {
                                const level = row.levels[skill.id] ?? null
                                const key = level ?? 'none'
                                return (
                                  <TableCell key={skill.id} className={cn('p-1.5 text-center', index === 0 && 'border-l')}>
                                    <button
                                      type="button"
                                      disabled={!editable}
                                      aria-label={t('skills.cell', {
                                        skill: skill.label,
                                        student: row.name,
                                        level: t(`skillLevels.${key}`),
                                      })}
                                      className={cn('h-10 w-14 rounded-xl border text-sm font-bold transition disabled:cursor-default', TONE[key])}
                                      onClick={() => {
                                        setSkill.mutate({ studentId: row.student.id, skillId: skill.id, term, level: NEXT[key] })
                                      }}
                                    >
                                      {level === null ? '·' : t(`skillLevelsShort.${level}`)}
                                    </button>
                                  </TableCell>
                                )
                              }),
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )
            }}
          </QueryState>
        </>
      )}
    </div>
  )
}
