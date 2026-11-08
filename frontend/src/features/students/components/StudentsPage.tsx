import { Link, useNavigate } from '@tanstack/react-router'
import { FileSpreadsheet, Search, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCurrentAcademicYear } from '@/features/academic/api'
import { Can } from '@/features/auth/RequirePermission'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useClassroomList } from '@/features/classes/api'
import { useCycles } from '@/features/cycles/api'
import { formatPhone } from '@/lib/format'

import { useStudentList, type StudentRow, type StudentStatus } from '../api'

export interface StudentsSearch {
  q?: string | undefined
  cycle?: string | undefined
  classe?: string | undefined
  statut?: StudentStatus | undefined
}

const STATUSES: StudentStatus[] = ['active', 'left', 'all']

function StudentLink({ row, className }: { row: StudentRow; className: string }) {
  return (
    <Link
      from="/$school"
      to="/$school/eleves/$studentId"
      params={{ studentId: row.id }}
      className={className}
    >
      <Avatar name={row.full_name} photoUrl={row.photo_url} size="sm" />
      <span className="grid min-w-0">
        <span className="truncate">{row.full_name}</span>
        <span className="text-xs font-normal text-muted-foreground">{row.matricule}</span>
      </span>
    </Link>
  )
}

/** Élèves de l'année en cours (vraie API), filtrables par cycle, classe, statut et recherche (filtres dans l'URL). */
export function StudentsPage({ search }: { search: StudentsSearch }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')
  const deferred = useDeferredValue(query)
  const year = useCurrentAcademicYear()
  const school = useCurrentSchool()
  const cycles = useCycles()
  const classrooms = useClassroomList()
  // Cycles où l'utilisateur voit des élèves (l'API ne renvoie déjà que ceux-là ; filtre aussi côté écran)
  const scope = school?.permissions['students.view']
  const visibleCycles = (cycles.data ?? []).filter(
    (candidate) => scope === null || scope?.includes(candidate.id) === true,
  )
  const cycle = visibleCycles.find((candidate) => candidate.code === search.cycle)
  const status = search.statut ?? 'active'
  const students = useStudentList({
    search: deferred,
    cycleId: cycle?.id ?? null,
    classroomId: search.classe ?? null,
    status,
  })

  const update = (patch: Partial<StudentsSearch>) => {
    void navigate({
      from: '/$school',
      to: '/$school/eleves',
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    })
  }

  const classOptions = (classrooms.data ?? []).filter(
    (classroom) => cycle === undefined || classroom.level.cycle_id === cycle.id,
  )

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('students.title')}
        description={
          year == null
            ? t('students.descriptionNoYear')
            : t('students.description', { year: year.label })
        }
        actions={
          <Can permission="students.manage">
            <Button asChild variant="outline">
              <Link from="/$school" to="/$school/import">
                <FileSpreadsheet aria-hidden />
                {t('students.import')}
              </Link>
            </Button>
            {year != null && (
              <Button asChild variant="accent">
                <Link from="/$school" to="/$school/inscriptions">
                  <UserPlus aria-hidden />
                  {t('students.enroll')}
                </Link>
              </Button>
            )}
          </Can>
        }
      />

      {year === null ? (
        <EmptyState title={t('classes.noYearTitle')} description={t('classes.noYearDescription')} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label={t('students.search')}
                placeholder={t('students.search')}
                className="pl-10"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
                onBlur={() => {
                  update({ q: query === '' ? undefined : query })
                }}
              />
            </div>
            <NativeSelect
              aria-label={t('students.cycle')}
              value={search.cycle ?? ''}
              onChange={(event) => {
                update({
                  cycle: event.target.value === '' ? undefined : event.target.value,
                  classe: undefined,
                })
              }}
            >
              <option value="">{t('common.allCycles')}</option>
              {visibleCycles.map((candidate) => (
                <option key={candidate.id} value={candidate.code}>
                  {candidate.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={t('students.classroom')}
              value={search.classe ?? ''}
              onChange={(event) => {
                update({ classe: event.target.value === '' ? undefined : event.target.value })
              }}
            >
              <option value="">{t('common.allClasses')}</option>
              {classOptions.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={t('students.status')}
              value={status}
              onChange={(event) => {
                const value = STATUSES.find((candidate) => candidate === event.target.value)
                update({ statut: value === 'active' ? undefined : value })
              }}
            >
              {STATUSES.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {t(`students.statuses.${candidate}`)}
                </option>
              ))}
            </NativeSelect>
          </div>

          <QueryState query={students}>
            {(pages) => {
              const rows = pages.pages.flatMap((page) => page.data)
              return rows.length === 0 ? (
                <EmptyState
                  illustration="search"
                  title={t('students.emptyTitle')}
                  description={t('students.emptyDescription')}
                />
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {students.hasNextPage
                      ? t('students.countMore', { count: rows.length })
                      : t('students.count', { count: rows.length })}
                  </p>
                  <Card className="hidden overflow-hidden p-0 md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('students.student')}</TableHead>
                          <TableHead>{t('students.classroom')}</TableHead>
                          <TableHead>{t('students.contact')}</TableHead>
                          <TableHead className="text-right">{t('students.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id} className="relative">
                            <TableCell>
                              <StudentLink
                                row={row}
                                className="flex items-center gap-3 font-semibold after:absolute after:inset-0 hover:underline"
                              />
                            </TableCell>
                            <TableCell>
                              {row.enrollment !== null && (
                                <CycleBadge
                                  code={row.enrollment.cycle_code}
                                  label={row.enrollment.classroom_name}
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.primary_contact !== null && (
                                <span className="grid">
                                  <span>{row.primary_contact.name}</span>
                                  <span className="tabular text-xs">
                                    {formatPhone(row.primary_contact.phone)}
                                  </span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={row.enrollment?.status === 'left' ? 'outline' : 'success'}
                              >
                                {t(`students.statuses.${row.enrollment?.status ?? 'active'}`)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                  <ul className="grid gap-2 md:hidden">
                    {rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft"
                      >
                        <StudentLink
                          row={row}
                          className="flex min-w-0 flex-1 items-center gap-3 font-semibold"
                        />
                        {row.enrollment !== null && (
                          <CycleBadge
                            code={row.enrollment.cycle_code}
                            label={row.enrollment.classroom_name}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                  {students.hasNextPage && (
                    <Button
                      variant="outline"
                      className="justify-self-center"
                      disabled={students.isFetchingNextPage}
                      onClick={() => void students.fetchNextPage()}
                    >
                      {t('students.showMore')}
                    </Button>
                  )}
                </div>
              )
            }}
          </QueryState>
        </>
      )}
    </div>
  )
}
