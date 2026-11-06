import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker, TermSelect } from '@/components/ClassPicker'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import {
  useGradingClassrooms,
  useSaveSkills,
  useSkillGrid,
  type SkillGrid,
  type SkillLevel,
} from '../api'

const NEXT: Record<SkillLevel | 'none', SkillLevel | null> = {
  none: 'A',
  A: 'EA',
  EA: 'NA',
  NA: null,
}
const TONE: Record<SkillLevel | 'none', string> = {
  A: 'bg-success-soft text-success-ink border-success/40',
  EA: 'bg-orange-100 text-accent-ink border-accent/40 dark:bg-orange/15',
  NA: 'bg-destructive-soft text-destructive-ink border-destructive/40',
  none: 'bg-surface text-muted-foreground border-dashed',
}

function isLevel(value: string | null): value is SkillLevel {
  return value === 'A' || value === 'EA' || value === 'NA'
}

/** Compétences rangées par domaine, dans l'ordre du référentiel. */
function domainsOf(grid: SkillGrid): { name: string; skills: SkillGrid['skills'] }[] {
  const domains: { name: string; skills: SkillGrid['skills'] }[] = []
  for (const skill of grid.skills) {
    const last = domains.at(-1)
    if (last?.name === skill.domain) last.skills.push(skill)
    else domains.push({ name: skill.domain, skills: [skill] })
  }
  return domains
}

/** Livret de compétences (classes évaluées par compétences) : un clic fait évoluer le niveau. */
export function SkillsPage() {
  const { t } = useTranslation()
  const classes = useGradingClassrooms()
  const classrooms = (classes.data ?? []).filter((classroom) => classroom.mode === 'competency')
  const [classroomId, setClassroomId] = useState('')
  const [termId, setTermId] = useState<string | null>(null)
  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]
  const grid = useSkillGrid(classroom?.id ?? '', termId)
  const save = useSaveSkills()

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('skills.title')} description={t('skills.description')} />
      {classes.isPending ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('skills.noClass')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul
              className="flex flex-wrap items-center gap-2 text-sm"
              aria-label={t('skills.legend')}
            >
              {(['A', 'EA', 'NA'] as const).map((level) => (
                <li
                  key={level}
                  className={cn('rounded-full border px-3 py-1 font-semibold', TONE[level])}
                >
                  {t(`skillLevelsShort.${level}`)} — {t(`skillLevels.${level}`)}
                </li>
              ))}
            </ul>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <ClassPicker classrooms={classrooms} value={classroom.id} onChange={setClassroomId} />
              <TermSelect
                terms={grid.data?.terms ?? []}
                value={grid.data?.term.id ?? ''}
                onChange={setTermId}
              />
            </div>
          </div>
          <QueryState query={grid}>
            {(data) => {
              const editable = data.can_manage
              const domains = domainsOf(data)
              const total = data.rows.length * data.skills.length
              const done = data.rows.reduce(
                (sum, row) => sum + row.levels.filter((cell) => cell.level !== null).length,
                0,
              )
              return data.rows.length === 0 ? (
                <EmptyState title={t('grades.noStudent')} />
              ) : (
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {t('skills.progress', { done, total })}
                    {save.data?.queued === true && ` · ${t('grades.queued')}`}
                  </p>
                  <Card className="overflow-x-auto p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2} className="sticky left-0 z-10 min-w-44 bg-card">
                            {t('grades.student')}
                          </TableHead>
                          {domains.map((domain) => (
                            <TableHead
                              key={domain.name}
                              colSpan={domain.skills.length}
                              className="border-l text-center"
                            >
                              {domain.name}
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow>
                          {domains.flatMap((domain) =>
                            domain.skills.map((skill, index) => (
                              <TableHead
                                key={skill.id}
                                className={cn(
                                  'min-w-28 text-center text-xs font-normal whitespace-normal',
                                  index === 0 && 'border-l',
                                )}
                              >
                                {skill.label}
                              </TableHead>
                            )),
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.rows.map((row) => (
                          <TableRow key={row.student.id}>
                            <TableCell className="sticky left-0 z-10 bg-card font-medium">
                              {row.student.full_name}
                            </TableCell>
                            {domains.flatMap((domain) =>
                              domain.skills.map((skill, index) => {
                                const raw =
                                  row.levels.find((cell) => cell.skill_id === skill.id)?.level ??
                                  null
                                const level = isLevel(raw) ? raw : null
                                const key = level ?? 'none'
                                return (
                                  <TableCell
                                    key={skill.id}
                                    className={cn('p-1.5 text-center', index === 0 && 'border-l')}
                                  >
                                    <button
                                      type="button"
                                      disabled={!editable}
                                      aria-label={t('skills.cell', {
                                        short:
                                          level === null ? '·' : t(`skillLevelsShort.${level}`),
                                        skill: skill.label,
                                        student: row.student.full_name,
                                        level: t(`skillLevels.${key}`),
                                      })}
                                      className={cn(
                                        'h-10 w-14 rounded-xl border text-sm font-bold transition disabled:cursor-default',
                                        TONE[key],
                                      )}
                                      onClick={() => {
                                        save.mutate({
                                          classroomId: classroom.id,
                                          termId: data.term.id,
                                          evaluations: [
                                            {
                                              student_id: row.student.id,
                                              skill_id: skill.id,
                                              level: NEXT[key],
                                            },
                                          ],
                                        })
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
